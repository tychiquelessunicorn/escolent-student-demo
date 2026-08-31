"use client";

import { useEffect } from "react";
import { writeTourMode } from "@/lib/demo-persistence";
import { writeTeacherTourMode } from "@/lib/teacher-tour";
import { writeAdminTourMode } from "@/lib/admin-tour";
import { writePedleadTourMode } from "@/lib/pedlead-tour";

export function TourReset() {
  useEffect(() => {
    writeTourMode(false);
    writeTeacherTourMode(false);
    writeAdminTourMode(false);
    writePedleadTourMode(false);
  }, []);

  return null;
}
