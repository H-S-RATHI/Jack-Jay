import { TwitterApi } from 'twitter-api-v2';
import { Buffer } from 'buffer';  // Import Buffer from the buffer package

// Replace these values with your actual credentials
const client = new TwitterApi({
  appKey: 'FNlmgZm0xHiySmwV63jDWVDJI',
  appSecret: 'mPf0KpUdpkIBJjWc65mKwpJKw5nP4JGQs63CPqvs4rdznjzcKT',
  accessToken: '1867777711747334144-l06S4Zce9iNC1t7lIbLEUjrIHGvt50',
  accessSecret: 'iLUCdvzLMwPYclBKAf87n8mlKsM555tpDqToVU6qZvy8z',
});

// Function to post a tweet, accepting tweet content as argument
export const postTweet = async (tweetContent) => {
  try {
    // If tweet content is binary data or needs encoding, use Buffer
    const encodedTweetContent = Buffer.from(tweetContent, 'utf-8').toString(); // Example of encoding
    
    // Post the tweet with the provided content
    const tweetResponse = await client.v2.tweet(encodedTweetContent);
    console.log('Tweet posted successfully:', tweetResponse);
  } catch (error) {
    console.error('Error:', error);
  }
};
