from flask import Flask, request, jsonify
import os
import sys

# Append the path to the Lexica wrapper so it can be imported regardless of where
# the server is executed from.
module_path = os.path.join(os.path.dirname(__file__), "Lexica.art")
if module_path not in sys.path:
    sys.path.append(module_path)

from Lex import Lexica  # type: ignore  # noqa: E402

app = Flask(__name__)


@app.route("/search", methods=["GET"])
def search_images():
    """Search for images on Lexica.

    Query parameters:
        query (str): The search term.

    Returns:
        JSON with the original query and a list of image URLs.
    """
    query = request.args.get("query")
    if not query:
        return jsonify({"error": "'query' parameter is required"}), 400

    try:
        images = Lexica(query=query).images()
    except Exception as exc:  # pylint: disable=broad-except
        # Catch-all to avoid leaking internal errors to the client
        return jsonify({"error": str(exc)}), 500

    return jsonify({"query": query, "images": images})


if __name__ == "__main__":
    # By default Flask binds only to 127.0.0.1. Binding to 0.0.0.0 makes the
    # server reachable from outside the host (e.g. Docker, remote machines).
    app.run(host="0.0.0.0", port=5000)
