import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'
import { getAuth } from "npm:firebase-admin@^12.0.0/auth";
import { getFirestore } from "npm:firebase-admin/firestore";

console.log('main function started')

const JWT_SECRET = Deno.env.get('JWT_SECRET')
const VERIFY_JWT = Deno.env.get('FUNCTIONS_VERIFY_JWT') === 'true'
const VERIFY_JWT_FIREBASE = false

function getAuthToken(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }
  const [bearer, token] = authHeader.split(' ')
  if (bearer !== 'Bearer') {
    throw new Error(`Auth header is not 'Bearer {token}'`)
  }
  return token
}

async function verifyJWT(jwt: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const secretKey = encoder.encode(JWT_SECRET)
  try {
    await jose.jwtVerify(jwt, secretKey)
  } catch (err) {
    console.error(err)
    return false
  }
  return true
}

// Função para verificar o token do Firebase usando REST API
async function verifyJWTFirebase(idToken: string) {

  try {

    // Inicializa o Firebase Admin
    const firebaseConfig = {
      apiKey: "AIzaSyCQBiazeXThblSXEyP8tlOxjpu-mfGq76o",
      authDomain: "agenda-tock.firebaseapp.com",
      projectId: "agenda-tock",
      storageBucket: "agenda-tock.firebasestorage.app",
      messagingSenderId: "282314346925",
      appId: "1:282314346925:web:b4207fbae88f098bfe1124",
      measurementId: "G-X3GPCEJHYQ"
    };

    // var app;
    // if (!getApps().length) {
    //   // var app = initializeApp(firebaseConfig);
    //   // const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY")!);
    //   // app = initializeApp({ credential: cert(serviceAccount) });
    // }

    const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY")!);
    var app = initializeApp({ credential: cert(serviceAccount) });

    // if (!getApps().length) {
    // const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY")!);
    // const app = initializeApp({ credential: cert(serviceAccount) });
    // }

    const auth = getAuth(app);

    const decodedToken = await auth.verifyIdToken(idToken);

    // // Firestore reference
    // const db = getFirestore();

    // // 🔎 Buscar documento
    // const docRef = db.collection("users").doc(decodedToken.uid);
    // const snapshot = await docRef.get();

    // if (!snapshot.exists) {
    //   return { msg: "User not found" };
    // }

    return true;

    return new Response(JSON.stringify({ token: idToken, decodedToken: decodedToken }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });



    const uid = decodedToken.uid;
    // Token is valid, proceed with your logic using the uid

    return new Response(JSON.stringify({ token: idToken, decodedToken: decodedToken, uid: uid }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });


  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return false;

    return new Response(JSON.stringify({
      error: error
    }), { status: 403 });
  }
}




serve(async (req: Request) => {
  if (req.method !== 'OPTIONS' &&  /*VERIFY_JWT*/ VERIFY_JWT_FIREBASE) {
    try {
      const token = getAuthToken(req)
      // const isValidJWT = await verifyJWT(token)
      const isValidJWT = await verifyJWTFirebase(token)

      console.log("isValidJWTFirebase: ", isValidJWT)
      if (!isValidJWT) {
        return new Response(JSON.stringify({ msg: 'Invalid JWT' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify({ msg: e.toString() }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const url = new URL(req.url)
  const { pathname } = url
  const path_parts = pathname.split('/')
  const service_name = path_parts[1]

  if (!service_name || service_name === '') {
    const error = { msg: 'missing function name in request' }
    return new Response(JSON.stringify(error), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const servicePath = `/home/deno/functions/${service_name}`
  console.error(`serving the request with ${servicePath}`)

  const memoryLimitMb = 150
  const workerTimeoutMs = 1 * 60 * 1000
  const noModuleCache = false
  const importMapPath = null
  const envVarsObj = Deno.env.toObject()
  const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])

  try {
    const worker = await EdgeRuntime.userWorkers.create({
      servicePath,
      memoryLimitMb,
      workerTimeoutMs,
      noModuleCache,
      importMapPath,
      envVars,
    })
    return await worker.fetch(req)
  } catch (e) {
    const error = { msg: e.toString() }
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
