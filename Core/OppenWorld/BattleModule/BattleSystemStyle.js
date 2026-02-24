import { css } from "../../WDevCore/WModules/WStyledRender.js";

export const battleStyle = css`
/* Estilos para el sistema de batalla */
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            font-family: 'Arial', sans-serif;
            color: #fff;
            position: fixed;
            top: 0;
            left: 0;
            opacity: 0;
            transition: all 0.3s;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 1000;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            border-radius: 6px;
        }
        #battle-overlay {
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            border-radius: 6px;
        }

        

        #battle-canvas {
            position: absolute;  /* ✅ Importante para que respete top/left */
            top: 0;
            left: 0;
            width: 100% !important;
            height: 100% !important;
            z-index: 1000;
            image-rendering: pixelated;
        }

        #battle-ui {
            position: relative;  /* ✅ Para que esté encima del canvas */
            z-index: 1001;
            width: 80%;
            max-width: 600px;
            /* ... resto de estilos ... */
        }

        .combat-panel {
            position: absolute;
            z-index:1000;
            bottom: 0;
            width: 100%;
            box-sizing: border-box;
            left: 0;
            padding: 20px;

        }
        
        #battle-ui {
            width: 100%;
            max-width: 100%;
            height: 100%;
            background: #222;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 100, 255, 0.3);
            box-sizing: border-box;
        }

        .battle-header {
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            color: #4af;
        }

        .battle-log {
            height: 120px;
            overflow-y: auto;
            background: #111;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 14px;
        }

        .combatants {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .party,
        .enemies {
            display: flex;
            flex-direction: row;
            gap: 30px;
        }

        .combatant {
            padding: 8px;
            border-radius: 50%;
            height: 100px;
            width:100px;
            background: #333;
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
        }

        .combatant.active {
            box-shadow: 0 0 0 2px #4af;
        }

        .combatant .data {
            position: absolute;
            bottom: 0;
            right: -20px;
            text-transform: capitalize;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 5px;
            padding: 5px;
        }

        .combatant.dead {
            opacity: 0.5;
            background: #522;
        }

        .hp-bar {
            height: 6px;
            background: #333;
            border-radius: 3px;
            overflow: hidden;
            flex-grow: 1;
            position: absolute;
            width: 100px;
            bottom: -10px;
        }

        .hp-fill {
            height: 100%;
            background: #4af;
            transition: width 0.3s;
        }

        .hp-fill.low {
            background: #f44;
        }

        .skills {
            display: flex;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
            padding: 10px 20px;            
            border: rgba(0, 100, 255, 0.3) 1px solid;
            border-radius: 36px;
            background-color: rgba(0, 0, 0, 0.3);
            width: fit-content;
        }

        .skill-btn {
            background: #333;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            transition: background 0.2s;
            border-radius: 50%;
            height: 50px;
            width: 50px;
            border: #fff 2px solid;
            transition: all 0.2s;
        }

        .skill-btn:hover {
            box-shadow: 0 0 5px 0 #fff;
            background: #444;
            filter: brightness(1.5);
        }

        .skill-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
            filter: saturate(0);
            pointer-events: none;
        }

        .turn-indicator {
            text-align: center;
            margin: 0;
            padding: 10px;
            font-weight: bold;
            color: #4af;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 0;
            border-radius: 5px;
            background-color: rgba(0, 0, 0, 0.3);
            margin-bottom: 10px;
        }  

`