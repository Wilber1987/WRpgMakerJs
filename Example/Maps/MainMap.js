//@ts-check

import { CharacterModel } from "../../WOpenWorldJs/Core/Common/CharacterModel.js";
import { DanaCharacter } from "../Characters/DanaCharacter.js";

import { BlockObject, GameMap } from "../../WOpenWorldJs/Core/OppenWorld/OpenWordModules/Models.js";
import { OpenWorldEngineView } from "../../WOpenWorldJs/Core/OppenWorld/OpenWorldEngineView.js";

import { vnEngine } from "../../WOpenWorldJs/Core/VisualNovel/VisualNovelEngine.js";
import { Character, Dialogue, Flow, Scene } from "../../WOpenWorldJs/Core/VisualNovel/VisualNovelModules.js";





const getAsset = (/** @type {string} */ asset) => "./Media/assets/Maps/" + asset;

const npc1 = new CharacterModel({
    Name: "Mage",
    MapData: [
        {
            name: "Ciudad1", posX: 10, posY: 15, action: () => {
                vnEngine.startScene("npc1Chat");
            }
        }
    ]
});

vnEngine.defineScene("npc1Chat", [
    Scene.Show("Scene/Mage_Scene.png"),
    DanaCharacter.Say("..."),
    npc1.Show(),
    Flow.Choice([
        Flow.Action("Saludar", [
            DanaCharacter.Say("Hola"),
            Dialogue.Say("Mage", "Hola"),
            () => vnEngine.Disconnect()
        ])
    ])
]);

const oppenWorld = new OpenWorldEngineView({
    character: DanaCharacter
});


const npc2 = new CharacterModel({
    Name: "Mage",
    MapData: [
        { name: "Ciudad1", posX: 70, posY: 10, action: () => alert("Mantén la calma y sigue tu camino.") }
    ]
});

// --- Crear el mapa Ciudad1 ---
const ciudad1 = new GameMap('Ciudad1', 24, 24, {
    //const ciudad1 = new GameMap('Ciudad1', 46, 27, {
    //const ciudad1 = new GameMap('Ciudad1', 46, 27, {
    spawnX: 1,   // Punto de inicio del jugador
    spawnY: 1,
    bgColor: '#666', // Calle gris
    NPCs: [npc1, npc2], // <-- Aquí se pasan los NPCs desde la creación
    backgroundImage: getAsset("City1/MAP_CITY_01-01.png")
});

// --- Agregar edificios (bloques marrones) ---
// Edificio 1
ciudad1.addObject(new BlockObject(2, 2, 4, 4, {
    color: '#8B4513', // Marrón oscuro
    autoTrigger: false,
    icon: getAsset("City1/EDIFICIO (2).png")
}));

// Puerta del edificio 1 (amarilla)
ciudad1.addObject(new BlockObject(7, 9, 1, 1, {
    color: '#FFD700', // Amarillo
    autoTrigger: true,
    Action: () => {
        alert("Puerta del edificio 1. Próximamente: interior.");
    }
}));

// Pero como tu fondo ya es gris, quizás solo necesites dejar espacios libres.
// --- Añadir el mapa al motor ---
oppenWorld.AddMap(ciudad1);

// --- Ir al mapa ---
//oppenWorld.GoToMap("Ciudad1");

// --- Crear NPC's ---
export const goToCity1 = () => {
    oppenWorld.Start();// lo envia al primer mapa registrado
}
