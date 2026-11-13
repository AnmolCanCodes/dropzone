import { useEffect, useRef } from "react";
import { createGame } from "../game/createGame";

export default function GameCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    const game = createGame(containerRef.current);
    return () => game.destroy(true); // important: React StrictMode mounts twice in dev
  }, []);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
}