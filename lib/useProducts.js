"use client";
import { useEffect, useState } from "react";

export function useProductsState() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const sync = () => {
      setLoading(true);
      fetch("/api/products", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : [])
        .then((value) => { if (active) setProducts(Array.isArray(value) ? value : []); })
        .catch(() => { if (active) setProducts([]); })
        .finally(() => { if (active) setLoading(false); });
    };

    sync();
    window.addEventListener("zv-products-updated", sync);
    const onStorage = (event) => {
      if (event.key === "zv-products-updated") sync();
    };
    const onFocus = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("zv-products-updated", sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { products, loading };
}

