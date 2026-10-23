import dns from "dns";
import mongoose from "mongoose";

const MONGODB_DNS_SERVERS = ["1.1.1.1", "8.8.8.8"];
const cache = (globalThis.mongooseCache ??= { promise: null });

async function resolveMongoUri(uri) {
  if (!uri.startsWith("mongodb+srv://")) return uri;

  const parsed = new URL(uri);
  if (!parsed.hostname || parsed.port) {
    throw new Error(
      "MONGODB_URI must use an Atlas SRV hostname without a port.",
    );
  }

  const rawAuthority = uri.slice("mongodb+srv://".length).split(/[/?#]/, 1)[0];
  const atIndex = rawAuthority.lastIndexOf("@");
  const credentials = atIndex >= 0 ? rawAuthority.slice(0, atIndex + 1) : "";
  const serviceName = parsed.searchParams.get("srvServiceName") || "mongodb";
  const options = new URLSearchParams(parsed.search);
  options.delete("srvServiceName");

  const resolver = new dns.promises.Resolver();
  resolver.setServers(MONGODB_DNS_SERVERS);

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    resolver.cancel();
  }, 10_000);

  try {
    const [records, txtRecords] = await Promise.all([
      resolver.resolveSrv("_" + serviceName + "._tcp." + parsed.hostname),
      resolver.resolveTxt(parsed.hostname).catch((error) => {
        if (error.code === "ENODATA" || error.code === "ENOTFOUND") return [];
        throw error;
      }),
    ]);

    if (!records.length) throw new Error("MongoDB DNS returned no SRV hosts.");
    if (txtRecords.length > 1)
      throw new Error("MongoDB DNS returned multiple TXT records.");

    const parentDomain = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const trustedDomain =
      "." + parentDomain.slice(parentDomain.indexOf(".") + 1);
    for (const record of records) {
      const host = record.name.toLowerCase().replace(/\.$/, "");
      const hostDomain = "." + host.slice(host.indexOf(".") + 1);
      if (!hostDomain.endsWith(trustedDomain)) {
        throw new Error(
          "MongoDB DNS returned a host outside the configured cluster.",
        );
      }
    }

    if (txtRecords[0]) {
      const txtOptions = new URLSearchParams(txtRecords[0].join(""));
      const allowedTxtOptions = new Set([
        "authsource",
        "replicaset",
        "loadbalanced",
      ]);
      const existingOptions = new Set(
        [...options.keys()].map((key) => key.toLowerCase()),
      );

      for (const [key, value] of txtOptions) {
        if (!allowedTxtOptions.has(key.toLowerCase())) {
          throw new Error("MongoDB DNS returned an unsupported TXT option.");
        }
        if (!existingOptions.has(key.toLowerCase())) options.set(key, value);
      }
    }

    if (
      ![...options.keys()].some((key) =>
        ["tls", "ssl"].includes(key.toLowerCase()),
      )
    ) {
      options.set("tls", "true");
    }

    const hosts = records.map(
      (record) => record.name.replace(/\.$/, "") + ":" + record.port,
    );
    const database = parsed.pathname || "/";
    const query = options.toString();
    return (
      "mongodb://" +
      credentials +
      hosts.join(",") +
      database +
      (query ? "?" + query : "")
    );
  } catch (error) {
    if (timedOut)
      throw new Error("MongoDB DNS SRV lookup timed out.", { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function dbConnect() {
  if (mongoose.connection.readyState === 1) return mongoose;

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) throw new Error("MONGODB_URI is not configured.");

  if (!cache.promise) {
    cache.promise = (async () => {
      const resolvedUri = await resolveMongoUri(uri);
      return mongoose.connect(resolvedUri, { serverSelectionTimeoutMS: 10000 });
    })()
      .then((m) => {
        return m;
      })
      .catch((err) => {
        cache.promise = null;
        console.error("[server]: Database connection unsuccessful", { name: err?.name, code: err?.code });
        throw err;
      });
  }

  return cache.promise;
}

export { dbConnect as connectDB };
export default dbConnect;
