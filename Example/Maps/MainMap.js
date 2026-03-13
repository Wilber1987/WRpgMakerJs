//@ts-check

import { CharacterModel } from "../../Core/Common/CharacterModel.js";
import { CharacterRegistry } from "../../Core/Common/CharacterRegistry.js";
import { SkillModel } from "../../Core/Common/SkillModel.js";
import { GameMenu } from "../../Core/Common/UIComponents/GameMenu.js";
import { GameStartScreen } from "../../Core/Common/UIComponents/GameStartScreen.js";
import { BlockObject, GameMap } from "../../Core/OppenWorld/OpenWordModules/Models.js";
import { OpenWorldEngineView } from "../../Core/OppenWorld/OpenWorldEngineView.js";
import { saveSystem, vnEngine } from "../../Core/VisualNovel/VisualNovelEngine.js";
import { Dialogue, Flow, Scene } from "../../Core/VisualNovel/VisualNovelModules.js";
import { DanaCharacter } from "../Characters/DanaCharacter.js";

const getAsset = (/** @type {string} */ asset) => "./Media/assets/" + asset;

// REGISTRAR SINGLETONS (prioridad sobre clases)

// Dana ya existen en memoria, se hidratarán en lugar de recrearse
CharacterRegistry.registerSingleton(DanaCharacter);

class WarriorModel extends CharacterModel {
    /**
    * @param {Partial<CharacterModel>} props
    */
    constructor(props) {
        props.SpritesFrames = { attack: 25 }
        props.Stats = {
            hp: 30,
            maxHp: 30,
            strength: 10,
            speed: 3000,
        }
        super(props)
        this.Skills = [
            new SkillModel({ numberTargets: 100 })
        ]
    }
}

export const Warrior = new WarriorModel({});

//en este caso solo debera haber una instancia de warrior al momento de restaurar la memoria
CharacterRegistry.registerSingleton(Warrior);

const npc1 = new CharacterModel({
    Name: "Mage",
    SpritesFrames: {
        //idle: 33,
        battle: 25,
        attack: 89,
        death: 25
    },
    MapData: [
        {
            name: "Ciudad1", posX: 24, posY: 14, action: () => {
                vnEngine.startScene("npc1Chat");
            }
        }
    ]
});

DanaCharacter.MapData.push({
    name: "Ciudad1", posX: 27, posY: 14, action: () => {
        vnEngine.startScene("danaJoinHistory");
    }
})

//#region SCENEAS DE HISTORIA EN MODO NOVELA VISUAL

vnEngine.defineScene("danaJoinHistory", [
    Scene.Show("assets/Maps/City1/scene1.png"),
    DanaCharacter.Show(),
    Flow.Choice([
        Flow.Action("Saludar", [
            Warrior.Say("Hola"),
            DanaCharacter.Say("Hola"),
            () => vnEngine.Disconnect()
        ]),
        Flow.Action("Solicitar que se una al equipo", [
            Warrior.Say("Hola, escuche que necesitas un equipo"),
            DanaCharacter.Say("Si yo estoy buscando equipo"),
            Warrior.Say("Excelente, unete ami"),
            DanaCharacter.Say("Claro"),
            DanaCharacter.SetVar("Join", true),
            () => {
                oppenWorldEngine.RegisterCharacter(DanaCharacter);
                DanaCharacter.partyPosition = 1;
                vnEngine.Disconnect()
            }
        ], { render: Flow.Var("DanaJoin", "==", false) }),
        Flow.Action("Solicitar que te siga", [
            Warrior.Say("Sigueme"),
            DanaCharacter.Say("Claro"),
            () => {
                DanaCharacter.follow(Warrior);
                //ciudad1.removeNpc(DanaCharacter);
                vnEngine.Disconnect()
            }
        ], { render: Flow.Var("DanaJoin", "!=", true) }),

    ])
]);

vnEngine.defineScene("npc1Chat", [
    Scene.Show("assets/Maps/City1/scene1.png"),
    Warrior.Say("..."),
    npc1.Show(),
    Flow.Choice([
        Flow.Action("Sigueme", [
            async () => {

                npc1.follow(Warrior);
                vnEngine.Disconnect();
            }
        ]), Flow.Action("Saludar", [
            DanaCharacter.Say("Hola"),
            Dialogue.Say("Mage", "Hola"),
            () => vnEngine.Disconnect()
        ]),
        Flow.Action("Entrenar", [
            DanaCharacter.Say("Hola entrenemos"),
            () => battle(),
            () => vnEngine.Disconnect()
        ])
    ])
]);

vnEngine.defineScene("start_game", [
    Scene.Show("assets/Maps/City1/scene1.png"),
    DanaCharacter.Say("..."),
    npc1.ShowR(),
    npc1.Say("....."),
    Warrior.ShowL(),
    Warrior.Say("Inicie la aventura"),
    () => {
        vnEngine.Disconnect();
        oppenWorldEngine.GoToMap("Ciudad1");
        new GameMenu().Connect();
    }
]);
//#endregion

const oppenWorldEngine = new OpenWorldEngineView({
    character: Warrior
});

// --- Crear el mapa Ciudad1 ---
const ciudad1 = new GameMap('Ciudad1', 64, 36, {
    //const ciudad1 = new GameMap('Ciudad1', 46, 27, {
    //const ciudad1 = new GameMap('Ciudad1', 46, 27, {
    spawnX: 23,   // Punto de inicio del jugador
    spawnY: 16,
    battleBackgrond: getAsset("Maps/City1/battleBg.png"),
    bgColor: '#666', // Calle gris
    NPCs: [npc1, DanaCharacter], // <-- Aquí se pasan los NPCs desde la creación
    backgroundImage: getAsset("Maps/City1/map1.png")
});

ciudad1.addObject(new BlockObject(19, 13, 1, 1, {
    icon: getAsset("items/chest.png"),
    //color: '#FFD700', // Amarillo opcional
    Action: () => {
        console.log("Prueba de proximidad auto disparada");
        battle()
    }
}));

//#region BLOQUES DE COLICIONES INVISIBLES dentro del mapa para delimitar el movimiento
// --- Objetos/Bloques para ciudad1 ---
ciudad1.addObject(new BlockObject(22, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(23, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(24, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(26, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(29, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(30, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(31, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 1, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 2, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 3, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 4, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 5, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 5, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(29, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(30, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(31, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 6, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 7, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 7, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 8, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 8, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(13, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(14, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(15, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 9, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(13, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(14, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(15, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 10, 1, 1, {}));
ciudad1.addObject(new BlockObject(8, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(13, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(14, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 11, 1, 1, {}));
ciudad1.addObject(new BlockObject(8, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(29, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(30, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(31, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(38, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(39, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(40, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(41, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(42, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(43, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(44, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 12, 1, 1, {}));
ciudad1.addObject(new BlockObject(8, 13, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 13, 1, 1, {}));
ciudad1.addObject(new BlockObject(44, 13, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 13, 1, 1, {}));
ciudad1.addObject(new BlockObject(8, 14, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 14, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 14, 1, 1, {}));
ciudad1.addObject(new BlockObject(9, 15, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 15, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 15, 1, 1, {}));
ciudad1.addObject(new BlockObject(10, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 16, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(29, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(30, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(31, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(32, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(33, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(34, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(35, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(36, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(37, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(38, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(39, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(40, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(41, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(42, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(43, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(44, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(45, 17, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(23, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(24, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(26, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 18, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 19, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(26, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(27, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(28, 20, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 21, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 22, 1, 1, {}));
ciudad1.addObject(new BlockObject(24, 22, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 22, 1, 1, {}));
ciudad1.addObject(new BlockObject(41, 22, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 23, 1, 1, {}));
ciudad1.addObject(new BlockObject(24, 23, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 23, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 24, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 24, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 24, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(14, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(15, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(16, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(17, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(18, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(19, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(20, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(21, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(22, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(23, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(24, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(25, 25, 1, 1, {}));
ciudad1.addObject(new BlockObject(11, 26, 1, 1, {}));
ciudad1.addObject(new BlockObject(12, 26, 1, 1, {}));
ciudad1.addObject(new BlockObject(13, 26, 1, 1, {}));
ciudad1.addObject(new BlockObject(14, 26, 1, 1, {}));
ciudad1.addObject(new BlockObject(15, 26, 1, 1, {}));


//#endregion

// --- Añadir el mapa al motor ---
// se pueden agregar multiples mapas y navegar entre ellos usando **oppenWorldEngine.GoToMap("nombre_mapa")**
oppenWorldEngine.AddMap(ciudad1);
// --- Ir al mapa ---
//oppenWorld.GoToMap("Ciudad1");

//#region SIMULADOR DE BATALLA
const battle = () => {
    // Crear enemigos de prueba
    const enemies = [
        new CharacterModel({
            Name: "goblin",
            Stats: {
                hp: 15,
                maxHp: 15,
                strength: 3,
                speed: 3,
            },
            isEnemy: true,
            SpritesFrames: { attack: 25 },
            Skills: [oppenWorldEngine.GameEngine.battleSystem.createBasicAttack()]
        }),
        new CharacterModel({
            Name: "goblin",
            Stats: {
                hp: 20,
                maxHp: 20,
                strength: 4,
                speed: 2,
            },
            SpritesFrames: { attack: 25 },
            isEnemy: true,
            Skills: [oppenWorldEngine.GameEngine.battleSystem.createBasicAttack()]
        }),
        new CharacterModel({
            Name: "goblin",
            Stats: {
                hp: 20,
                maxHp: 20,
                strength: 4,
                speed: 2,
            },
            SpritesFrames: { attack: 25 },
            isEnemy: true,
            Skills: [oppenWorldEngine.GameEngine.battleSystem.createBasicAttack()]
        })
    ];

    // Crear grupo de prueba
    /*ejemplo: const party = [
        DanaCharacter,
        npc1,
        Warrior
    ]; */
    npc1.partyPosition = 0;
    Warrior.partyPosition = 3;
    const partyDePrueba = oppenWorldEngine.GetParty(npc1);
    console.log(partyDePrueba);

    // Iniciar batalla
    /** es posible iniciar la batalla sin especificar el equipo de combate 
     * de esta forma "oppenWorldEngine.StartBattle(enemies);" esto tomara por defecto el
     * los personajes que tengan asignado posicion en el equipo y que esten registrados
     * "oppenWorldEngine.RegisterCharacter(DanaCharacter);" con la propiedad "partyPosition = n" */
    oppenWorldEngine.StartBattle(enemies, partyDePrueba);

}

//#endregion
const screenOptions = [
    {
        name: "New Game", startGame: true, action: () => {
            oppenWorldEngine.GoToMap("Ciudad1")
            new GameMenu().Connect()
        }
    }, {
        name: "Continuar", startGame: false, action: (/** @type {GameStartScreen} */ screenView) => {
            saveSystem.showSaveLoadScreen(true, () => { new GameMenu(screenView).Connect() });
        }
    }, {
        name: "Test 2", startGame: true, action: () => {
            vnEngine.startScene("start_game");
        }
    }
]
/* 
GameStartScreen es un webcomponent creado para ser la pantalla principal, sin embargo puede ser cualquier interfaz
que tenga opciones para activar las funciones del motor, ejemplo: **oppenWorldEngine.GoToMap("Ciudad1")** o **vnEngine.startScene("start_game")**
asi mismo **GameMenu** tambien es un webcomponent que sirve como menu flotante, pero puede ser remplazado por otros menus o simplemente agregar 
todos los componentes que se requieran  
 */
const screenView = new GameStartScreen({
    screenOptions: screenOptions
})
oppenWorldEngine.screenView = screenView;
document.body.append(screenView)


/**podrias disparar el evento que quieras al cargar el sitio o simplemente ejecutar el motor de forma directa*/
window.onload = () => {
    //document.body.append(screenView)
    //oppenWorldEngine.Start();// lo envia al primer mapa registrado
}
