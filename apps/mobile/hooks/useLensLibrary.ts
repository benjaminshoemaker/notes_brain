import { useMemo } from "react";
import type { Lens, LensTemplate } from "@notesbrain/shared";

import {
  createLensInputFromTemplate,
  curatedLensTemplates,
  getTemplateInstallState,
  type LensLibraryInstallState
} from "../lib/lensLibrary";
import { useLenses } from "./useLenses";

export type LensLibraryItem = {
  template: LensTemplate;
  installState: LensLibraryInstallState;
  installedLens: Lens | null;
};

export function useLensLibrary() {
  const { data: lenses = [], isLoading, error, create } = useLenses();

  // Derives Installed from source_template_id plus source_template_version.
  const templates = useMemo<LensLibraryItem[]>(
    () =>
      curatedLensTemplates.map((template) => ({
        template,
        ...getTemplateInstallState(template, lenses)
      })),
    [lenses]
  );

  const install = async (template: LensTemplate) => {
    return create.mutateAsync(createLensInputFromTemplate(template));
  };

  return {
    templates,
    isLoading,
    error,
    install,
    installMutation: create
  };
}
