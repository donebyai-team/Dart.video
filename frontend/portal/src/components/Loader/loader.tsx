"use client";

import { FallbackSpinner } from "@/atoms/FallbackSpinner";

export const AuthLoading = () => (
  <div className="h-screen flex items-center justify-center bg-muted/30 overflow-hidden">
    <FallbackSpinner />
  </div>
);