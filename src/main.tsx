import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[main.tsx] Módulo carregado");
console.log("[main.tsx] Root element:", document.getElementById("root"));

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Elemento root não encontrado!");
  }
  console.log("[main.tsx] Criando root do React");
  const root = createRoot(rootElement);
  console.log("[main.tsx] Renderizando App");
  root.render(<App />);
  console.log("[main.tsx] App renderizado com sucesso");
} catch (error) {
  console.error("[main.tsx] Erro ao renderizar:", error);
  throw error;
}
