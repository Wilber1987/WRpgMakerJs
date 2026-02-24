tengo este sistema de convate, y un canvas perparado para hacer uso de el:

```javascript
//@ts-check
// --------------------------------------------------
// Sistema de Batalla - Versión con Canvas y Sprites

import { CharacterModel } from "../../Common/CharacterModel.js";
import { TILE_SIZE, DPR } from "../OpenWorldEngineView.js";

// --------------------------------------------------
export class BattleSystem {
    /**
     * @param {import("../OpenWorldEngineView.js").OpenWorldEngineView} engine
     */
    constructor(engine) {
        this.engine = engine;
        this.isActive = false;

        /** @type {CharacterModel[]} */
        this.combatants = [];
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.battleLog = [];
        this.overlay = engine.shadowRoot.querySelector('#battle-overlay');
        this.battleLogEl = engine.shadowRoot.querySelector('#battle-log');
        this.turnIndicator = engine.shadowRoot.querySelector('#turn-indicator');
        this.partyCombatantsEl = engine.shadowRoot.querySelector('#party-combatants');
        this.enemyCombatantsEl = engine.shadowRoot.querySelector('#enemy-combatants');
        this.skillButtonsEl = engine.shadowRoot.querySelector('#skill-buttons');
        /**@type {HTMLCanvasElement} */// @ts-ignore
        this.Canvas = engine.BattleCanvas;
    }

    // Iniciar una batalla
    /**
     * @param {CharacterModel[]} party
     * @param {CharacterModel[]} enemies
     * */
    startBattle(party, enemies) {
        this.isActive = true;
        this.combatants = [...party, ...enemies];
        this.battleLog = [];

        // Inicializar combatientes si no tienen estadísticas
        this.combatants.forEach(combatant => {
            combatant.Stats.maxHp = combatant.Stats.maxHp || combatant.Stats.hp || 1;
            combatant.Stats.hp = combatant.Stats.hp || combatant.Stats.maxHp;
            combatant.Stats.strength = combatant.Stats.strength || 1;
            combatant.Stats.speed = combatant.Stats.speed || 1;
            combatant.Skills = combatant.Skills || [this.createBasicAttack()];
        });

        // Calcular orden de turnos basado en velocidad
        this.calculateTurnOrder();

        // Mostrar la interfaz de batalla
        this.overlay.style.display = 'flex';

        // Actualizar la UI
        this.updateBattleUI();
        this.logBattleMessage("¡La batalla ha comenzado!");

        // Iniciar el primer turno
        this.startNextTurn();
    }

    // Calcular orden de turnos basado en velocidad
    calculateTurnOrder() {
        this.turnOrder = [...this.combatants].sort((a, b) => b.Stats.speed - a.Stats.speed);
    }

    startNextTurn() {
        let nextIndex = this.currentTurnIndex;
        let attempts = 0;

        do {
            nextIndex = (nextIndex + 1) % this.turnOrder.length;
            attempts++;
            if (attempts > this.turnOrder.length) {
                this.endBattle();
                return;
            }
        } while (this.turnOrder[nextIndex].Stats.hp <= 0);

        this.currentTurnIndex = nextIndex;
        const currentCombatant = this.turnOrder[this.currentTurnIndex];

        this.updateBattleUI();
        this.logBattleMessage(`Turno de ${currentCombatant.Name}`);

        if (currentCombatant.isEnemy) {
            setTimeout(() => this.executeEnemyTurn(currentCombatant), 1000);
        } else {
            this.showSkills(currentCombatant);
        }
    }

    executeEnemyTurn(enemy) {
        const targets = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        if (targets.length === 0) { this.endBattle(); return; }

        const target = targets[Math.floor(Math.random() * targets.length)];
        const skill = enemy.Skills[0];
        this.useSkill(enemy, skill, target);
    }

    showSkills(combatant) {
        this.skillButtonsEl.innerHTML = '';
        combatant.Skills.forEach(skill => {
            const button = document.createElement('button');
            button.className = 'skill-btn';
            button.textContent = skill.name;
            button.onclick = () => {
                const targets = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);
                const target = this.targetEnemy || (targets[0] ?? null);
                if (target) {
                    this.useSkill(combatant, skill, target);
                }
                button.disabled = true;
            };
            this.skillButtonsEl.appendChild(button);
        });
    }

    useSkill(user, skill, target) {
        const damage = skill.calculateDamage?.(user, target) ?? Math.max(1, user.Stats.strength);
        target.Stats.hp = Math.max(0, target.Stats.hp - damage);

        this.logBattleMessage(`${user.Name} usa ${skill.name} contra ${target.Name} y causa ${damage} de daño.`);

        if (target.Stats.hp <= 0) {
            this.logBattleMessage(`¡${target.Name} ha sido derrotado!`);
        }

        this.updateBattleUI();

        setTimeout(() => { this.startNextTurn(); }, 1500);
    }

    updateBattleUI() {
        // Actualizar combatientes del grupo
        this.partyCombatantsEl.innerHTML = '';
        this.enemyCombatantsEl.innerHTML = '';

        const currentCombatant = this.turnOrder[this.currentTurnIndex];
        this.turnIndicator.textContent = `Turno: ${currentCombatant.Name}`;

        // Mostrar combatientes del grupo aliado
        this.combatants
            .filter(c => !c.isEnemy)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                this.partyCombatantsEl.appendChild(combatantEl);
            });

        // Mostrar enemigos
        this.combatants
            .filter(c => c.isEnemy)
            .forEach(combatant => {
                const combatantEl = this.createCombatantElement(combatant);
                combatantEl.classList += " enemyBlock"
                combatantEl.addEventListener("click", () => {
                    this.targetEnemy = combatant;
                    this.enemyCombatantsEl.querySelectorAll(".enemyBlock")?.forEach(enemyBlock => {
                        enemyBlock.style.boxShadow = "";
                    })
                    combatantEl.style.boxShadow = "0 0 5px 0 red"

                })
                this.enemyCombatantsEl.appendChild(combatantEl);
            });

        this.battleLogEl.scrollTop = this.battleLogEl.scrollHeight;
    }

    createCombatantElement(combatant) {
        const el = document.createElement('div');
        el.className = 'combatant';

        if (combatant.hp <= 0) {
            el.classList.add('dead');
        }

        if (combatant === this.turnOrder[this.currentTurnIndex]) {
            el.classList.add('active');
        }

        const hpPercent = (combatant.Stats.hp / combatant.Stats.maxHp) * 100;
        el.innerHTML = `
                    <div>
                        <div>${combatant.Name}</div>
                        <div class="small">HP: ${combatant.Stats.hp}/${combatant.Stats.maxHp}</div>
                    </div>
                    <div class="hp-bar">
                        <div class="hp-fill ${hpPercent < 30 ? 'low' : ''}" style="width: ${hpPercent}%"></div>
                    </div>
                `;

        return el;
    }

    logBattleMessage(message) {
        this.battleLog.push(message);
        this.battleLogEl.innerHTML = this.battleLog.map(msg => `<div>${msg}</div>`).join('');
    }

    endBattle() {
        const aliveParty = this.combatants.filter(c => !c.isEnemy && c.Stats.hp > 0);
        const aliveEnemies = this.combatants.filter(c => c.isEnemy && c.Stats.hp > 0);

        if (aliveParty.length > 0 && aliveEnemies.length === 0) {
            this.logBattleMessage("¡Victoria! Todos los enemigos han sido derrotados.");
        } else if (aliveParty.length === 0 && aliveEnemies.length > 0) {
            this.logBattleMessage("Derrota... Todos los miembros del grupo han caído.");
        } else {
            this.logBattleMessage("La batalla ha terminado en empate.");
        }

        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.isActive = false;
        }, 3000);
    }

    createBasicAttack() {
        return {
            name: "Ataque Básico",
            calculateDamage: (user, target) => Math.max(1, user.Stats.strength)
        };
    }
}

```

necesito lo siguiente: 

- que el canvas funcione con una grid de 8 * 6, definido en el constructor y suando coordenadas 0, 0 hasta 7, 5 
- que tanto los enemigos como los aliados se renderizen en cada parte del canvas haciendo uso de sus sprite: ya que son CharacterModel tenemos una lista de spritites disponibles para usar, usaremos Sprite.Normal (debe de ser definido cual va a ser el sprite por defecto, ejemplo this.BasicSprite = "Normal") por el momento  y cada personaje se ubicara en un cuadro de la grid usando las primeras 4 colunas para los aliados y las otras 4 para los enemigos
- como permitire a un maximo de 6  integrantes por equipo  la renderizacion iniciara a partir del cuadro 1 * 1 de cada bloque, por lo que el equipo de aliados quedara de esta manera en su primer bloque
    * aliados: 
        - col 1, fila 1 : primer poersonaje 
        - col 2, fila 1 : segundo personaje
        - col 1, fila 2  : tercer personaje
        - col 2, fila 2 :cuarto....
        - asi susesivamente .. hasta 6
    * el caso de los enemigos 
        - col 5, fila 1 : primer personaje 
        - col 6, fila 1 : primer personaje 
        - asi susesivamente .. hasta 6
- luego con cada accion el render deberia cambiar de estado, por ejemplo atacar, en este caso this.AttackSprite = "Attack" y este al dar click en ataque cambiara el estado hara un loop del sprite (25 fps por ejemplo) y luego regresara a su estado this.BasicSprite
- cuando el hp de un personaje llegue a 0 debera cambiar a estado  this.DeathSprite = "Death"

