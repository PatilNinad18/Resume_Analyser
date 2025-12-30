import { type LoaderFunctionArgs } from "@react-router/node";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  // Handle Chrome DevTools and other special paths
  if (url.pathname.startsWith('/.well-known/') ||
      url.pathname.includes('devtools') ||
      url.pathname.startsWith('/favicon.ico')) {
    return new Response(null, { status: 404 });
  }

  // For other unmatched routes, return 404
  throw new Response("Not Found", { status: 404 });
}