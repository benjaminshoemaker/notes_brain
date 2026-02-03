import { useEffect, useState } from "react";

import { createUseAuth } from "@notesbrain/shared";

import { supabase } from "../lib/supabaseClient";

export const useAuth = createUseAuth(supabase, { useEffect, useState });
