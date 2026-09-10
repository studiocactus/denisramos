"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

export function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("A conexão com o Supabase não foi configurada.");
  return createBrowserClient(config.url, config.key);
}
