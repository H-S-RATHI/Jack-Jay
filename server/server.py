from flask import Flask, request, jsonify
from datetime import datetime
from requests_oauthlib import OAuth1Session
from flask_cors import CORS
import pymongo
import os
import math

# Initialize Flask app
app = Flask(__name__)
CORS(app)


# MongoDB connection URL
url = "mongodb+srv://goluu000111:SMoJPCdKxwTqZIuv@cluster0.n0jrf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

# Connect to MongoDB
try:
    client = pymongo.MongoClient(url)
    db = client["jackjay"]  # Database name
    collection = db["Twiter_data"]  # Collection name
    print("Connected to MongoDB")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# Initialize variables for Twitter API credentials
credentials = {
    "app_key": "S14YjZu6EBudzltlFOjkr2eBTq",
    "app_secret": "QfxNfVK4cB2lIXvBt9NJlJQkmw6daFVPdDdJwpudVkL4D2jYZfX",
    "access_token": "1683885683536977920-KfQkFnu3JLRRRZ16ymluTG8zzR4tXWr",
    "access_secret": "eX1T9DjOqhbo6WMUiqzfyygxk1nRpdKK6ykShqmrkxlMOw",
}

def get_twitter_client():
    """Initialize and return an OAuth1 Twitter client."""
    try:
        oauth = OAuth1Session(
            client_key=credentials["app_key"],
            client_secret=credentials["app_secret"],
            resource_owner_key=credentials["access_token"],
            resource_owner_secret=credentials["access_secret"],
        )
        return oauth
    except Exception as e:
        print(f"Error initializing Twitter client: {e}")
        return None

def convert_to_iso8601(date_str):
    """Convert a datetime string to ISO 8601 format required by Twitter API."""
    dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
    return dt.isoformat() + "Z"  # Add 'Z' to indicate UTC time

def fetch_tweets(username, last_date):
    """Fetch tweets for a specific username after a given date."""
    oauth = get_twitter_client()
    if not oauth:
        print("Failed to initialize Twitter client")
        return []

    # Get user ID by username
    user_url = f'https://api.twitter.com/2/users/by/username/{username}'
    user_response = oauth.get(user_url)

    if user_response.status_code != 200:
        print(f"Error fetching user data: {user_response.status_code} {user_response.text}")
        return []

    user_data = user_response.json()
    user_id = user_data['data']['id']

    # Fetch tweets after the specified date
    tweets_url = f'https://api.twitter.com/2/users/{user_id}/tweets'
    params = {
        'max_results': 5,
        'start_time': convert_to_iso8601(last_date),
        'tweet.fields': 'created_at,referenced_tweets,attachments,text',
    }
    tweets_response = oauth.get(tweets_url, params=params)

    if tweets_response.status_code != 200:
        print(f"Error fetching tweets: {tweets_response.status_code} {tweets_response.text}")
        return []

    tweets_data = tweets_response.json()
    tweets_list = []

    for tweet in tweets_data.get('data', []):
        tweet_type = "Tweet"
        if 'referenced_tweets' in tweet:
            for ref_tweet in tweet['referenced_tweets']:
                if ref_tweet['type'] == 'replied_to':
                    tweet_type = "Reply"
                elif ref_tweet['type'] == 'retweeted':
                    tweet_type = "Retweet"

        # Check media type and set it to "No Media Available" if it's not present
        media_type = "No Media Available"
        if 'attachments' in tweet and 'media_keys' in tweet['attachments']:
            media_type = "Photo/Video"

        tweets_list.append({
            "TweetText": tweet['text'],
            "Type": tweet_type,
            "Author": user_data['data']['name'],
            "CreatedAt": tweet['created_at'],
            "Media": media_type
        })

    # Sort tweets by CreatedAt in ascending order (oldest first)
    tweets_list.sort(key=lambda x: x["CreatedAt"])

    return tweets_list

@app.route('/fetch_and_append_tweets', methods=['POST'])
def fetch_and_store_tweets():
    """Fetch tweets from Twitter API and store them in MongoDB."""
    data = request.get_json()
    username = data.get("username")
    last_date = data.get("last_date")

    if not username or not last_date:
        return jsonify({"error": "Missing username or last_date"}), 400

    tweets_list = fetch_tweets(username, last_date)

    if not tweets_list:
        return jsonify({"message": "No new tweets fetched or an error occurred."}), 500

    try:
        # Insert the sorted tweets into MongoDB
        result = collection.insert_many(tweets_list)
        return jsonify({"message": f"Successfully added {len(result.inserted_ids)} tweets to the database."}), 200
    except Exception as e:
        print(f"Error inserting data into MongoDB: {e}")
        return jsonify({"error": "Error inserting data into MongoDB"}), 500



def clean_data(data):
    """
    Cleans invalid values in a dictionary or list of dictionaries.
    Replaces NaN with 'No media available'.
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, float) and math.isnan(value):
                data[key] = "No media available"
            elif isinstance(value, dict):
                clean_data(value)
            elif isinstance(value, list):
                data[key] = [clean_data(item) if isinstance(item, dict) else item for item in value]
    return data

@app.route('/get_tweets', methods=['GET'])
def get_tweets():
    try:
        # Fetch tweets from MongoDB
        tweets = list(collection.find({}, {'_id': 0}))  # Exclude MongoDB's _id field
        # Clean data
        cleaned_tweets = [clean_data(tweet) for tweet in tweets]
        return jsonify(cleaned_tweets)
    except Exception as e:
        print(f"Error fetching tweets: {e}")
        return jsonify({"error": "Error fetching tweets from the database"}), 500

    
app.route("/c", methods=["GET"])
def root():
    return "Welcome to the Twitter Backend API! Use /tweet to post tweets or /update-keys to update credentials."

# POST route to handle tweets
@app.route("/tweet", methods=["POST"])
def post_tweet():
    data = request.json
    tweet_content = data.get("tweetContent")

    if not tweet_content:
        return jsonify({"message": "Tweet content is required."}), 400

    client = get_twitter_client()

    try:
        # Post the tweet using Twitter API
        response = client.post(
            "https://api.twitter.com/2/tweets",
            json={"text": tweet_content},
        )
        response_data = response.json()

        if response.status_code == 201:
            return jsonify({"message": "Tweet posted successfully!", "data": response_data})
        else:
            return jsonify({"message": "Error posting tweet", "error": response_data}), response.status_code

    except Exception as e:
        return jsonify({"message": "Error posting tweet", "error": str(e)}), 500

# Route to update API credentials
@app.route("/", methods=["POST"])
def update_credentials():
    data = request.json

    app_key = data.get("appKey")
    app_secret = data.get("appSecret")
    access_token = data.get("accessToken")
    access_secret = data.get("accessSecret")

    if not (app_key and app_secret and access_token and access_secret):
        return jsonify({"message": "All fields (appKey, appSecret, accessToken, accessSecret) are required."}), 400

    try:
        # Update credentials
        global credentials
        credentials = {
            "app_key": app_key,
            "app_secret": app_secret,
            "access_token": access_token,
            "access_secret": access_secret,
        }

        return jsonify({"message": "API credentials updated successfully!"})

    except Exception as e:
        return jsonify({"message": "Error updating API credentials", "error": str(e)}), 500

# Start the server
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(debug=True, host="0.0.0.0", port=port)
