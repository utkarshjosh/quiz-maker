#!/bin/bash

# Generate TypeScript types from Go schema using quicktype
# This script converts the Go structs in schema.go to TypeScript types

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Generating TypeScript types from Go schema...${NC}"

# Check if quicktype is installed
if ! command -v quicktype &> /dev/null; then
    echo -e "${RED}❌ quicktype is not installed. Please install it first:${NC}"
    echo "npm install -g quicktype"
    exit 1
fi

# Check if schema.json exists
if [ ! -f "../../services/socket/schema.json" ]; then
    echo -e "${RED}❌ schema.json not found at ../../services/socket/schema.json${NC}"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p ./generated

# Generate TypeScript types from schema.json
echo -e "${YELLOW}📝 Converting schema.json to TypeScript...${NC}"
quicktype \
    --lang typescript \
    --src-lang json \
    --top-level Message \
    --out ./generated/websocket-types-generated.ts \
    ../../services/socket/schema.json

# Generate additional types for individual message types
echo -e "${YELLOW}📝 Generating individual message types...${NC}"

# Generate types for each message type
for message_type in JoinMessage CreateRoomMessage StartMessage AnswerMessage KickMessage LeaveMessage PingMessage StateMessage QuestionMessage RevealMessage ScoreMessage EndMessage ErrorMessage PongMessage JoinedMessage LeftMessage KickedMessage Member UserStat LeaderEntry QuizSettings QuizStats User RoomState QuizData Question UserStats LeaderboardEntry QuizStatistics; do
    echo "  - Generating $message_type..."
    quicktype \
        --lang typescript \
        --src-lang json \
        --top-level "$message_type" \
        --out "./generated/${message_type,,}-generated.ts" \
        ../../services/socket/schema.json
done

# Create a combined types file
echo -e "${YELLOW}📝 Creating combined types file...${NC}"
cat > ./generated/combined-types.ts << 'EOF'
/**
 * Auto-generated TypeScript types from Go schema
 * Generated on: $(date)
 * Source: services/socket/schema.json
 */

// Import all generated types
export * from './websocket-types-generated';
EOF

# Add individual type exports
for message_type in JoinMessage CreateRoomMessage StartMessage AnswerMessage KickMessage LeaveMessage PingMessage StateMessage QuestionMessage RevealMessage ScoreMessage EndMessage ErrorMessage PongMessage JoinedMessage LeftMessage KickedMessage Member UserStat LeaderEntry QuizSettings QuizStats User RoomState QuizData Question UserStats LeaderboardEntry QuizStatistics; do
    echo "export * from './${message_type,,}-generated';" >> ./generated/combined-types.ts
done

echo -e "${GREEN}✅ Type generation completed!${NC}"
echo -e "${GREEN}📁 Generated files:${NC}"
echo "  - ./generated/websocket-types-generated.ts"
echo "  - ./generated/combined-types.ts"
echo "  - ./generated/*-generated.ts (individual types)"

echo -e "${YELLOW}💡 Next steps:${NC}"
echo "  1. Review the generated types"
echo "  2. Update websocket-types.ts to use generated types"
echo "  3. Run 'npm run build' to compile"
echo "  4. Test the integration"
