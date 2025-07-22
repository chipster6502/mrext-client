import { WebSocketHook } from "react-use-websocket/dist/lib/types";
import useWebSocket from "react-use-websocket";
import { ServerState, useServerStateStore } from "../lib/store";
import { getWsEndpoint } from "../lib/api";

function handleMessage(event: MessageEvent, serverState: ServerState) {
  const msg = event.data;
  const idx = msg.indexOf(":");
  const cmd = msg.substring(0, idx);
  const data = msg.substring(idx + 1);

  switch (cmd) {
    case "indexStatus":
      const args = data.split(",");
      if (args.length === 5) {
        const [ready, indexing, totalSteps, currentStep, currentDesc] = args;
        serverState.setSearch({
          ready: ready === "y",
          indexing: indexing === "y",
          totalSteps: parseInt(totalSteps),
          currentStep: parseInt(currentStep),
          currentDesc: currentDesc,
        });
      }
      break;
    case "gameRunning":
      // ✅ SOLUCIÓN: Solo actualizar si los datos realmente cambiaron
      const currentGame = serverState.activeGame;
      if (data !== currentGame) {
        console.log(`🔄 Game changed: "${currentGame}" → "${data}"`);
        serverState.setActiveGame(data);
      } else {
        console.log(`⏸️ Game unchanged: "${data}"`);
      }
      break;
    case "coreRunning":
      // ✅ SOLUCIÓN: Solo actualizar si los datos realmente cambiaron
      const currentCore = serverState.activeCore;
      if (data !== currentCore) {
        console.log(`🔄 Core changed: "${currentCore}" → "${data}"`);
        serverState.setActiveCore(data);
      } else {
        console.log(`⏸️ Core unchanged: "${data}"`);
      }
      break;
  }
}

export default function useWs(): WebSocketHook {
  const serverState = useServerStateStore();

  return useWebSocket(getWsEndpoint(), {
    onMessage: (event) => handleMessage(event, serverState),
    shouldReconnect: () => true,
    share: true,
  });
}