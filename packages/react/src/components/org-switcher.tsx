"use client";

import { useState, useEffect, useRef } from "react";
import type { OrganizationResource } from "@inai-dev/types";
import { useSession } from "../hooks/use-session";

export function OrganizationSwitcher() {
  const { orgId, isLoaded } = useSession();
  const [orgs, setOrgs] = useState<OrganizationResource[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/organizations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.data)) setOrgs(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isLoaded || orgs.length === 0) return null;

  const current = orgs.find((o) => o.id === orgId);

  async function switchOrg(id: string) {
    setOpen(false);
    await fetch("/api/auth/set-active-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: id }),
    });
    window.location.reload();
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: "6px 12px",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 6,
          color: "#fff",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        {current?.name ?? "Select organization"}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "calc(100% + 4px)",
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 4,
            minWidth: 200,
            zIndex: 50,
          }}
        >
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => switchOrg(org.id)}
              style={{
                display: "block",
                width: "100%",
                padding: "8px 12px",
                background: org.id === orgId ? "#2563eb22" : "none",
                border: "none",
                color: "#fff",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
                borderRadius: 4,
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
