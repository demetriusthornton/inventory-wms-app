import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import type {
  Firestore,
  Query,
  QuerySnapshot,
} from "firebase/firestore";

interface UseCollectionOptions {
  db: Firestore | null;
  basePath: string | null;
  collectionName: string;
  whereFilters?: {
    field: string;
    op: "==" | "!=" | "<=" | ">=" | "<" | ">";
    value: any;
  }[];
}

export function useCollection<T>({
  db,
  basePath,
  collectionName,
  whereFilters,
}: UseCollectionOptions): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !basePath) {
      setData([]);
      setLoading(false);
      return;
    }
    const colRef = collection(db, `${basePath}/${collectionName}`);
    let q: Query = query(colRef) as Query;
    if (whereFilters && whereFilters.length > 0) {
      whereFilters.forEach((flt) => {
        q = query(q, where(flt.field, flt.op, flt.value));
      });
    }
    const unsub = onSnapshot(
      q,
      (snap: QuerySnapshot) => {
        const rows: any[] = [];
        snap.docs.forEach((docSnap) => {
          rows.push({ id: docSnap.id, ...docSnap.data() });
        });
        setData(rows as T[]);
        setLoading(false);
      },
      (err) => {
        console.error("useCollection: error", collectionName, err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db, basePath, collectionName, JSON.stringify(whereFilters)]);

  return { data, loading };
}
