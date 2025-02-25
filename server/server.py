import os
import re
import logging
from flask import Flask, request, jsonify
from newspaper import Article
from flask_cors import CORS  # Import CORS
from groq import Groq


# Configure logging
logging.basicConfig(level=logging.INFO)

# Initialize the Groq client with your API key from environment variables for security.
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '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')
client = Groq(api_key=GROQ_API_KEY)

# Initialize Flask application
app = Flask(__name__)

# Configure CORS (For production, consider restricting origins)
CORS(app, resources={r"/*": {"origins": "*"}})

def crawl(url):
    """
    Crawl the article from the given URL, extract and clean text.
    """
    article = Article(url)
    article.download()
    article.parse()
    # Extract the first 500 words of the article
    text = article.text.split()[:500]
    cleaned_text = clean_text(" ".join(text))
    return cleaned_text

def clean_text(text):
    """
    Clean the text by removing extra whitespace, URLs, non-ASCII characters, and newlines.
    Limit the cleaned text to 500 characters.
    """
    # Remove extra whitespace between words
    cleaned = re.sub(r'\s+', ' ', text)
    # Remove any URLs
    cleaned = re.sub(r'http[s]?://\S+', '', cleaned)
    # Remove non-ASCII characters or unwanted symbols
    cleaned = re.sub(r'[^\x00-\x7F]+', ' ', cleaned)
    # Collapse multiple newlines into one space
    cleaned = re.sub(r'\n+', ' ', cleaned)
    # Trim and limit length to 500 characters
    cleaned = cleaned.strip()[:500]
    return cleaned

@app.route('/scrape', methods=['POST'])
def scrape():
    """
    Endpoint that receives a search query and a list of URLs,
    crawls each URL, cleans the text, and sends it to the Groq API for summarization.
    Returns a JSON response with the summary.
    """
    try:
        data = request.json
        if not data or 'searchQuery' not in data or 'urls' not in data:
            return jsonify({'error': 'Missing searchQuery or urls'}), 400

        search_query = data.get('searchQuery', '')
        urls = data.get('urls', [])

        scraped_texts = []
        valid_urls= []
        for url in urls:
            try:
                scraped_text = crawl(url)
                if scraped_text:
                    scraped_texts.append(scraped_text)
                    valid_urls.append(url)
                if len(valid_urls)>=6:
                    break
            except Exception as e:
                logging.error(f"Error extracting content from {url}: {e}")
                scraped_texts.append(f"Error extracting content from {url}")

        combined_text = "\n".join(scraped_texts)

        # Send the combined text to Groq for summarization
        summary_response = client.chat.completions.create(
            messages=[
                {
                   "role": "system",
                    "content": (
                    "You are an expert summarizer. Analyze the following text and answer the user's question. "
                    "Only summarize the key information relevant to the question. Provide advice or actionable steps only when the question specifically requests them, or if you believe they are necessary. Otherwise, feel free to skip it. "
                    )
                }
                    ,
                {
                    "role": "user",
                    "content": f"User searched for: {search_query}."
                },
                {
                    "role": "user",
                    "content": (f"Text to analyze:\n{combined_text}\n---\nPlease summarize based on the search query: "
                                f"{search_query}. ")
                }
            ],
            model="mixtral-8x7b-32768",
        )

        summary = summary_response.choices[0].message.content
        return jsonify({ 'summary': summary, 'valid_urls': valid_urls })
    except Exception as ex:
        logging.exception("An error occurred in /scrape endpoint")
        return jsonify({'error': str(ex)}), 500

if __name__ == '__main__':
    # Bind to all interfaces so that the container (or host) can be accessed externally
    app.run(debug=True, host="0.0.0.0", port=5000)
