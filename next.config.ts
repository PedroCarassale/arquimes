import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  compiler: {
    define: {
      __VUE_OPTIONS_API__: true,
      __VUE_PROD_DEVTOOLS__: false,
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
  },
  async redirects() {
    const m = "/materias/:id";
    return [
      { source: "/materias", destination: "/", permanent: false },
      { source: "/materias/chats", destination: "/", permanent: false },
      { source: `${m}/examenes/nuevo`, destination: `${m}/calendario?nuevo=1`, permanent: false },
      { source: `${m}/examenes/:eid`, destination: `${m}/calendario/:eid`, permanent: false },
      { source: `${m}/examenes`, destination: `${m}/calendario`, permanent: false },
      { source: `${m}/notas/:nid`, destination: `${m}/clases/:nid`, permanent: false },
      { source: `${m}/notas`, destination: `${m}/clases`, permanent: false },
      { source: `${m}/generados/:aid`, destination: `${m}/apuntes/generado/:aid`, permanent: false },
      { source: `${m}/generados`, destination: `${m}/apuntes?tipo=generados`, permanent: false },
      { source: `${m}/materiales/:mid`, destination: `${m}/apuntes/archivo/:mid`, permanent: false },
      { source: `${m}/examen`, destination: `${m}/calendario?nuevo=1`, permanent: false },
      { source: `${m}/cargar`, destination: `${m}/apuntes`, permanent: false },
      { source: `${m}/:legacy(chat|inicio|practica|preparacion)`, destination: m, permanent: false },
    ];
  },
};

export default nextConfig;
