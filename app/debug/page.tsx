// contacts-app/app/debug/page.tsx
export const dynamic = 'force-dynamic'; // Force re-fetch every time

export default async function DebugPage() {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
  
  console.log("------------------------------------------------");
  console.log("1. CHECKING ENV VAR:", strapiUrl);

  // Test 1: Check if Env Var exists
  if (!strapiUrl) {
    return (
      <div className="p-10 text-red-600">
        <h1 className="text-2xl font-bold">CRITICAL ERROR: Env Var Missing</h1>
        <p>process.env.NEXT_PUBLIC_STRAPI_URL is undefined.</p>
        <p>Check your .env.local file exists and is in the root folder.</p>
      </div>
    );
  }

  // Test 2: Try a public ping (no auth required)
  // We try to fetch the homepage or a public endpoint just to see if server is reachable
  let errorLog = "";
  let status = "Pending";
  
  try {
    console.log("2. ATTEMPTING FETCH TO:", `${strapiUrl}/api/contacts`);
    
    const res = await fetch(`${strapiUrl}/api/contacts`, { 
      cache: 'no-store',
      // We purposefully don't send a token to see if we get a 401 (good) or Connection Refused (bad)
    });
    
    status = `${res.status} ${res.statusText}`;
    console.log("3. FETCH STATUS:", status);
    
    if (res.status === 403 || res.status === 401) {
      return (
        <div className="p-10 text-green-700 bg-green-50">
          <h1 className="text-2xl font-bold">SUCCESS: Connected to Strapi!</h1>
          <p>Server responded with: <strong>{status}</strong></p>
          <p>This is GOOD. It means Strapi is running and reachable. The previous error was likely just an Auth Token issue.</p>
        </div>
      );
    }
    
  } catch (err: any) {
    console.error("4. FETCH ERROR DETAIL:", err);
    errorLog = JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
    status = "Network Error";
  }

  return (
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-bold">Connection Debugger</h1>
      <div className="border p-4 rounded bg-gray-100">
        <p><strong>Strapi URL:</strong> {strapiUrl}</p>
        <p><strong>Connection Status:</strong> {status}</p>
      </div>

      {status === "Network Error" && (
        <div className="border border-red-500 bg-red-50 p-4 rounded text-red-700">
           <h2 className="font-bold">CONNECTION FAILED</h2>
           <p>Node.js cannot reach Strapi. Check the error below:</p>
           <pre className="mt-4 bg-black text-white p-4 overflow-auto rounded text-xs">
             {errorLog}
           </pre>
           <h3 className="font-bold mt-4">Common Fixes:</h3>
           <ul className="list-disc pl-5 mt-2">
             <li>Replace <code>localhost</code> with <code>127.0.0.1</code> in <code>.env.local</code></li>
             <li>Ensure Strapi is running on port 1337</li>
             <li>If using Docker, use the container name instead of localhost</li>
           </ul>
        </div>
      )}
    </div>
  );
}