import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  Compass,
  Download,
  FileSpreadsheet,
  Github,
  Globe2,
  GraduationCap,
  MapPinned,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import proj4 from "proj4";
import * as XLSX from "xlsx";
import "./styles.css";

proj4.defs(
  "EPSG:32719",
  "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs +type=crs"
);
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs +type=crs");

const REQUIRED_COLUMNS = ["Position X", "Position Y", "NAME1"];

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildGpx(points) {
  const waypoints = points
    .map(
      (point) => `  <wpt lat="${point.lat}" lon="${point.lon}">
    <name>${escapeXml(point.name)}</name>
  </wpt>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Excel a GPX - Waldir A. Apaza A." xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}
</gpx>
`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "application/gpx+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function App() {
  const [fileName, setFileName] = useState("");
  const [points, setPoints] = useState([]);
  const [error, setError] = useState("");
  const [isReading, setIsReading] = useState(false);

  const gpxContent = useMemo(() => buildGpx(points), [points]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    setError("");
    setPoints([]);

    if (!file) return;

    setFileName(file.name);
    setIsReading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        throw new Error("El archivo no contiene datos en la primera hoja.");
      }

      const missingColumns = REQUIRED_COLUMNS.filter(
        (column) => !Object.prototype.hasOwnProperty.call(rows[0], column)
      );

      if (missingColumns.length) {
        throw new Error(`Faltan columnas: ${missingColumns.join(", ")}.`);
      }

      const converted = rows
        .map((row, index) => {
          const x = Number(row["Position X"]);
          const y = Number(row["Position Y"]);

          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return null;
          }

          const [lon, lat] = proj4("EPSG:32719", "EPSG:4326", [x, y]);

          return {
            id: `${row.NAME1 || "Punto"}-${index}`,
            name: row.NAME1 || `Punto ${index + 1}`,
            x,
            y,
            lat: Number(lat.toFixed(8)),
            lon: Number(lon.toFixed(8)),
          };
        })
        .filter(Boolean);

      if (!converted.length) {
        throw new Error("No se encontraron coordenadas validas para convertir.");
      }

      setPoints(converted);
    } catch (readError) {
      setError(readError.message || "No se pudo leer el archivo Excel.");
    } finally {
      setIsReading(false);
    }
  }

  function handleDownload() {
    const baseName = fileName.replace(/\.[^/.]+$/, "") || "waypoints";
    downloadTextFile(`${baseName}.gpx`, gpxContent);
  }

  return (
    <main>
      <section className="hero">
        <nav className="nav">
          <div className="brand">
            <MapPinned size={28} />
            <span>Excel a GPX</span>
          </div>
        </nav>

        <div className="heroGrid">
          <div className="heroCopy">
            <p className="eyebrow">
              <Sparkles size={18} /> UTM Zona 19 Sur a WGS84
            </p>
            <h1>Convierte tus puntos de Excel en rutas GPX para OsmAnd.</h1>
            <p className="intro">
              Sube un archivo `.xls` o `.xlsx` con las columnas Position X,
              Position Y y NAME1. La app transforma las coordenadas y genera un
              GPX descargable en segundos.
            </p>
            <blockquote>
              "Cada linea de codigo tambien es una ruta hacia una idea mejor."
            </blockquote>
            <div className="authorBadge">
              <GraduationCap size={24} />
              <div>
                <span>Desarrollado por</span>
                <strong>Waldir. A Apaza A.</strong>
                <small>Versión 1.0</small>
              </div>
            </div>
          </div>

          <div className="converterPanel">
            <div className="panelHeader">
              <div>
                <p>Generador GPX</p>
                <h2>Cargar Excel</h2>
              </div>
              <Compass size={34} />
            </div>

            <label className="dropzone">
              <UploadCloud size={42} />
              <span>{fileName || "Selecciona tu archivo Excel"}</span>
              <small>Formatos compatibles: .xls, .xlsx</small>
              <input accept=".xls,.xlsx" type="file" onChange={handleFile} />
            </label>

            {isReading && <p className="status">Procesando coordenadas...</p>}
            {error && <p className="error">{error}</p>}

            <button className="downloadButton" disabled={!points.length} onClick={handleDownload}>
              <Download size={20} />
              Descargar GPX
            </button>
          </div>
        </div>
      </section>

      <section className="features" aria-label="Resumen de la aplicacion">
        <article>
          <FileSpreadsheet />
          <h3>Lectura Excel</h3>
          <p>Usa la primera hoja y respeta los nombres de columnas del script original.</p>
        </article>
        <article>
          <Globe2 />
          <h3>Conversion precisa</h3>
          <p>Transforma desde EPSG:32719 UTM 19S hacia EPSG:4326 WGS84.</p>
        </article>
        <article>
          <CheckCircle2 />
          <h3>GPX inmediato</h3>
          <p>Genera waypoints con nombre para usarlos en OsmAnd u otros mapas.</p>
        </article>
      </section>

      {points.length > 0 && (
        <section className="preview">
          <div className="sectionTitle">
            <p>Vista previa</p>
            <h2>{points.length} puntos convertidos</h2>
          </div>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Latitud</th>
                  <th>Longitud</th>
                </tr>
              </thead>
              <tbody>
                {points.slice(0, 8).map((point) => (
                  <tr key={point.id}>
                    <td>{point.name}</td>
                    <td>{point.lat}</td>
                    <td>{point.lon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer>
        <span>© {new Date().getFullYear()} Waldir. A Apaza A. Todos los derechos reservados.</span>
        <span>
          <Github size={16} /> Desarrollo con React
        </span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
