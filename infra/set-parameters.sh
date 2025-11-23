#!/bin/bash
set -e

# -------------------------------
# USAGE & HELP
# -------------------------------
show_usage() {
    cat << EOF
Usage: $0 <service-type> <mode> [options]

Arguments:
  service-type    Service type: "api" or "socket"
  mode            Operation mode: "print" or "push"

Modes:
  print           Fetch and display all environment variables from SSM Parameter Store
  push            Push environment variables from a local file to SSM Parameter Store

Options:
  --env-file <path>      Output file path for print mode (default: ./<service-type>.env)
  --source-file <path>   Source file path for push mode (required for push mode)

Examples:
  # Print all envs for api service
  $0 api print

  # Print all envs and save to custom file
  $0 api print --env-file /tmp/api.env

  # Push envs from local file to SSM
  $0 api push --source-file ./api.env

  # Push envs for socket service
  $0 socket push --source-file ./socket.env
EOF
    exit 1
}

# -------------------------------
# PARSE ARGUMENTS
# -------------------------------
SERVICE_TYPE="$1"
MODE="$2"

if [ -z "$SERVICE_TYPE" ] || [ -z "$MODE" ]; then
    show_usage
fi

if [ "$SERVICE_TYPE" != "api" ] && [ "$SERVICE_TYPE" != "socket" ]; then
    echo "Error: service-type must be 'api' or 'socket'"
    show_usage
fi

if [ "$MODE" != "print" ] && [ "$MODE" != "push" ]; then
    echo "Error: mode must be 'print' or 'push'"
    show_usage
fi

# Parse optional arguments
ENV_FILE=""
SOURCE_FILE=""

shift 2
while [[ $# -gt 0 ]]; do
    case $1 in
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --source-file)
            SOURCE_FILE="$2"
            shift 2
            ;;
        *)
            echo "Error: Unknown option: $1"
            show_usage
            ;;
    esac
done

# Set defaults
if [ -z "$ENV_FILE" ]; then
    ENV_FILE="./${SERVICE_TYPE}.env"
fi

# Validate push mode requirements
if [ "$MODE" == "push" ] && [ -z "$SOURCE_FILE" ]; then
    echo "Error: --source-file is required for push mode"
    show_usage
fi

# -------------------------------
# CONFIG
# -------------------------------
PARAM_PREFIX="/quiz/$SERVICE_TYPE"

echo "========================================="
echo " Service: $SERVICE_TYPE"
echo " Mode: $MODE"
echo " SSM Path: $PARAM_PREFIX"
echo "========================================="

# -------------------------------
# MODE: PRINT - Fetch and display envs from SSM
# -------------------------------
if [ "$MODE" == "print" ]; then
    echo ""
    echo "Fetching parameters from SSM Parameter Store..."
    
    # Create temporary file for raw SSM output
    TEMP_FILE=$(mktemp)
    trap "rm -f $TEMP_FILE" EXIT
    
    # Fetch parameters from SSM
    if ! aws ssm get-parameters-by-path \
        --path "$PARAM_PREFIX" \
        --recursive \
        --with-decryption \
        --query "Parameters[*].{Name:Name,Value:Value}" \
        --output text > "$TEMP_FILE" 2>/dev/null; then
        echo "Warning: No parameters found at path: $PARAM_PREFIX"
        echo "Creating empty env file."
        touch "$ENV_FILE"
        exit 0
    fi
    
    # Check if file is empty
    if [ ! -s "$TEMP_FILE" ]; then
        echo "No parameters found at path: $PARAM_PREFIX"
        touch "$ENV_FILE"
        exit 0
    fi
    
    # Format: convert "/quiz/api/PORT   3000" → "PORT=3000"
    rm -f "$ENV_FILE"
    touch "$ENV_FILE"
    
    while IFS=$'\t' read -r NAME VALUE; do
        if [ -n "$NAME" ] && [ -n "$VALUE" ]; then
            KEY=$(basename "$NAME")   # extract last part
            echo "$KEY=$VALUE" >> "$ENV_FILE"
        fi
    done < "$TEMP_FILE"
    
    echo ""
    echo "Environment variables (saved to: $ENV_FILE):"
    echo "----------------------------------------"
    cat "$ENV_FILE"
    echo "----------------------------------------"
    echo ""
    echo "✓ Successfully fetched $(wc -l < "$ENV_FILE" | tr -d ' ') parameters"
fi

# -------------------------------
# MODE: PUSH - Push envs from file to SSM
# -------------------------------
if [ "$MODE" == "push" ]; then
    # Validate source file exists
    if [ ! -f "$SOURCE_FILE" ]; then
        echo "Error: Source file not found: $SOURCE_FILE"
        exit 1
    fi
    
    echo ""
    echo "Reading environment variables from: $SOURCE_FILE"
    echo "Pushing to SSM Parameter Store: $PARAM_PREFIX"
    echo ""
    
    PUSHED_COUNT=0
    SKIPPED_COUNT=0
    ERROR_COUNT=0
    
    # Read and process each line
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        if [[ -z "$line" ]] || [[ "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Parse KEY=VALUE format
        if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
            KEY="${BASH_REMATCH[1]}"
            VALUE="${BASH_REMATCH[2]}"
            
            # Remove leading/trailing whitespace from key
            KEY=$(echo "$KEY" | xargs)
            
            # Handle quoted values (remove surrounding quotes)
            if [[ "$VALUE" =~ ^\"(.*)\"$ ]] || [[ "$VALUE" =~ ^\'(.*)\'$ ]]; then
                VALUE="${BASH_REMATCH[1]}"
            fi
            
            # Construct full SSM parameter name
            PARAM_NAME="$PARAM_PREFIX/$KEY"
            
            echo "  → Setting $KEY..."
            
            # Push to SSM Parameter Store
            if aws ssm put-parameter \
                --name "$PARAM_NAME" \
                --value "$VALUE" \
                --type "String" \
                --overwrite \
                --no-cli-pager > /dev/null 2>&1; then
                ((PUSHED_COUNT++))
            else
                echo "    ✗ Failed to set $KEY"
                ((ERROR_COUNT++))
            fi
        else
            echo "  ⚠ Skipping invalid line: $line"
            ((SKIPPED_COUNT++))
        fi
    done < "$SOURCE_FILE"
    
    echo ""
    echo "========================================="
    echo " Push Summary:"
    echo "   ✓ Successfully pushed: $PUSHED_COUNT"
    echo "   ⚠ Skipped (invalid): $SKIPPED_COUNT"
    echo "   ✗ Errors: $ERROR_COUNT"
    echo "========================================="
    
    if [ $ERROR_COUNT -gt 0 ]; then
        exit 1
    fi
fi
