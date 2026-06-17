export type SiteConfig =
  | {
      kind: "static";
      name: string;
      route: "/";
      source: string;
      outDir: string;
    }
  | {
      kind: "bun-html";
      name: string;
      route: `/${string}`;
      entrypoint: string;
      outDir: string;
      publicPath: `/${string}/`;
    };

export const sites: SiteConfig[] = [
  {
    kind: "static",
    name: "home",
    route: "/",
    source: "apps/home/static",
    outDir: "dist",
  },
  {
    kind: "bun-html",
    name: "swedish-teacher",
    route: "/swedish-teacher",
    entrypoint: "apps/swedish-teacher/index.html",
    outDir: "dist/swedish-teacher",
    publicPath: "/swedish-teacher/",
  },
];
