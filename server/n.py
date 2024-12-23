from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAFwmxgEAAAAAY80WJCmlDSRAAlJ%2FH8z0mP3Ihq8%3DBbq9Gh90oxEnZi2Ch8xwGHU0ADcT4qYe2QRLYIGqzPuHzqpiMa'

def fetch_tweets(username, last_date):
    # Get user ID by username
    user_url = f'https://api.twitter.com/2/users/by/username/{username}'
    headers = {'Authorization': f'Bearer {BEARER_TOKEN}'}
    user_response = requests.get(user_url, headers=headers)

    if user_response.status_code != 200:
        return {"error": "Error fetching user data", "status_code": user_response.status_code}

    user_data = user_response.json()
    user_id = user_data['data']['id']

    # Fetch tweets after the specified date
    tweets_url = f'https://api.twitter.com/2/users/{user_id}/tweets'
    params = {
        'max_results': 100,  # Adjust as needed
        'start_time': last_date,
        'tweet.fields': 'created_at,referenced_tweets,attachments,text',
    }
    tweets_response = requests.get(tweets_url, headers=headers, params=params)

    if tweets_response.status_code != 200:
        return {"error": "Error fetching tweets", "status_code": tweets_response.status_code}

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

        media_type = "None"
        if 'attachments' in tweet and 'media_keys' in tweet['attachments']:
            media_type = "Photo/Video"

        tweets_list.append({
            "TweetText": tweet['text'],
            "Type": tweet_type,
            "Author": user_data['data']['name'],
            "CreatedAt": tweet['created_at'],
            "Media": media_type
        })

    return tweets_list

@app.route('/fetch-tweets', methods=['GET'])
def get_tweets():
    username = request.args.get('username')
    last_date = request.args.get('lastDate')

    if not username or not last_date:
        return jsonify({"error": "Missing required parameters"}), 400

    tweets = fetch_tweets(username, last_date)
    if "error" in tweets:
        return jsonify(tweets), tweets.get("status_code", 500)

    return jsonify({"tweets": tweets})

if __name__ == "__main__":
    app.run(port=3000)
