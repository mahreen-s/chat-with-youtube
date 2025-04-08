import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create different ratelimiters for different types of requests
export const videoLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(1, '1 d'), // 1 video per day
  analytics: true,
  prefix: '@upstash/ratelimit:video',
});

export const searchLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 d'), // 3 searches per day
  analytics: true,
  prefix: '@upstash/ratelimit:search',
});

export const chatLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 d'), // 5 questions per day
  analytics: true,
  prefix: '@upstash/ratelimit:chat',
});

// Helper function to get the user's IP address
export function getIP(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0];
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

// Helper function to check limits and return appropriate response
export async function checkLimit(
  request: Request,
  type: 'video' | 'search' | 'chat'
) {
  const ip = getIP(request);
  let limit;
  
  switch (type) {
    case 'video':
      limit = videoLimit;
      break;
    case 'search':
      limit = searchLimit;
      break;
    case 'chat':
      limit = chatLimit;
      break;
  }

  const { success, limit: maxLimit, reset, remaining } = await limit.limit(ip);
  
  if (!success) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: `You have reached your daily limit for ${type} requests. Please try again tomorrow.`,
          reset,
          remaining,
          type,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": maxLimit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "X-RateLimit-Type": type,
          },
        }
      )
    };
  }

  return { 
    success: true, 
    headers: {
      "X-RateLimit-Limit": maxLimit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
      "X-RateLimit-Type": type,
    },
    remaining,
    type,
  };
} 