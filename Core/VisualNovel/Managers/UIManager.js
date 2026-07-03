//@ts-check

import { CharacterContainer } from '../../Common/UIComponents/CharacterContainer.js';

/**
 * Gestor de interfaz de usuario
 * Mantiene compatibilidad con VisualNovelView existente
 */
export class UIManager {

    /**
     * @param {Object} dependencies
     * @param {import('../VidualNovelView.js').VisualNovelView} dependencies.view
     * @param {Object.<string, HTMLElement | null | undefined>} dependencies.uiElements
     * @param {import('../Managers/AudioManager.js').AudioManager} dependencies.audioManager
     * @param {import('../VisualNovelEngine.js').VisualNovelEngine} dependencies.engine
     */
    constructor(dependencies) {
        this.view = dependencies.view;
        this.uiElements = dependencies.uiElements;
        this.audioManager = dependencies.audioManager;
        this.engine = dependencies.engine;

        /** @type {boolean} */
        this._isWaitingForInput = false;
    }

    /**
     * Muestra texto con animación de escritura
     * @param {string} name 
     * @param {string} text 
     * @param {string | null} audio 
     * @param {boolean} isFemale 
     * @returns {Promise<void>}
     */
    async showText(name, text, audio, isFemale) {
        const textBox = this.uiElements.textBox;
        const nameBox = this.uiElements.nameBox;
        const textContainer = this.uiElements.textContainer;

        if (!textBox || !nameBox || !textContainer) return;

        // Configurar nombre
        nameBox.textContent = name || '';
        nameBox.className = isFemale ? 'female' : 'male';

        // Mostrar contenedor
        textContainer.style.opacity = '1';
        textBox.style.opacity = '0';
        textBox.textContent = '';

        // Forzar reflow
        void textBox.offsetWidth;
        textBox.style.opacity = '1';

        // Registrar en historial (COMPATIBLE)
        this.engine.history.push({ name, text });

        // Reproducir audio si existe
        let audioFinished = false;
        if (audio) {
            this.engine.stopAllAudio();
            const sound = new Audio(audio);
            sound.loop = false;
            this.engine.activeAudioInstances.push(sound);

            try {
                await sound.play();
                sound.onended = () => { audioFinished = true; };
                sound.onerror = () => { audioFinished = true; };
            } catch (err) {
                audioFinished = true;
            }
        }

        // Animación letra por letra (COMPATIBLE)
        for (let i = 0; i < text.length; i++) {
            textBox.textContent += text[i];
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        // Esperar input (COMPATIBLE)
        await this._waitForInput(audioFinished, textBox.textContent.length);
    }

    /**
     * Espera input del usuario
     * @private
     * @param {boolean} audioFinished 
     * @returns {Promise<void>}
     */
    async _waitForInput(audioFinished, textLenght = 0) {
        if (!this.engine.autoPlay) {
            return new Promise(resolve => {
                this._isWaitingForInput = true;

                const cleanup = () => {
                    this._isWaitingForInput = false;
                    if (this.engine.clickHandler) {
                        document.removeEventListener('click', this.engine.clickHandler);
                    }
                    if (this.engine.keyHandler) {
                        document.removeEventListener('keypress', this.engine.keyHandler);
                    }
                };

                this.engine.clickHandler = () => {
                    cleanup();
                    resolve();
                };

                this.engine.keyHandler = (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        cleanup();
                        resolve();
                    }
                };

                document.addEventListener('click', this.engine.clickHandler);
                document.addEventListener('keypress', this.engine.keyHandler);
            });
        }
        await new Promise(resolve => setTimeout(resolve, this.engine.autoPlayTimeOut + (textLenght * 30)));
    }

    /**
     * Muestra opciones de elección
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @param {string | number | null} sceneName 
     * @param {boolean} [isGlobal=false]
     * @returns {Promise<void>}
     */
    async showChoices(command, sceneName, isGlobal = false) {
        if (!command.options) return;

        const options = command.options;
        const textContainer = this.uiElements.textContainer;

        if (textContainer) {
            textContainer.style.opacity = '0';
        }

        // ✅ CORRECCIÓN: Limpiar handlers de waitForClick antes de mostrar choices
        if (this.engine.clickHandler) {
            document.removeEventListener("click", this.engine.clickHandler);
            this.engine.clickHandler = null;
        }
        if (this.engine.keyHandler) {
            document.removeEventListener("keypress", this.engine.keyHandler);
            this.engine.keyHandler = null;
        }

        // Filtrar opciones visibles (COMPATIBLE)
        const validOptions = options.filter(option =>
            option.render == true ||
            option.render == undefined ||
            this.engine.evaluateCondition(option.render)
        );

        if (validOptions.length === 0) return;

        // Separar por tipo de menú (COMPATIBLE)
        const tabOptions = validOptions.filter(o => o.typeMenu === 'TAB');
        const menuOptions = validOptions.filter(o => o.typeMenu === 'MENU');
        const floatingOptions = validOptions.filter(o => o.typeMenu === 'FLOATING');
        const positionedOptions = validOptions.filter(o => o.xpos !== undefined && o.ypos !== undefined);
        const defaultOptions = validOptions.filter(o => !o.typeMenu && o.xpos === undefined);

        // 1. Menú TAB
        if (tabOptions.length > 0 && this.uiElements.choicesContainer) {
            const tabWrapper = document.createElement('div');
            tabWrapper.className = 'menu-wrapper menu-tab-container';
            tabWrapper.style.gridTemplateColumns = `repeat(${Math.min(4, tabOptions.length)}, 1fr)`;

            for (const option of tabOptions) {
                const button = await this._createChoiceButton(option, tabWrapper, sceneName, command, isGlobal);
                tabWrapper.appendChild(button);
            }

            if (!isGlobal) {
                this.uiElements.choicesContainer.appendChild(tabWrapper);
                this.uiElements.choicesContainer.style.display = 'grid';
                this.uiElements.choicesContainer.style.opacity = '1';
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(tabWrapper);
            }
        }

        // 2. Menú lateral MENU
        if (menuOptions.length > 0 && this.uiElements.choicesContainerFullScreen) {
            const menuWrapper = document.createElement('div');
            menuWrapper.className = 'menu-wrapper menu-container';

            for (const option of menuOptions) {
                const button = await this._createChoiceButton(option, menuWrapper, sceneName, command, isGlobal);
                menuWrapper.appendChild(button);
            }

            if (!isGlobal) {
                this.uiElements.choicesContainerFullScreen.appendChild(menuWrapper);
                this.uiElements.choicesContainerFullScreen.style.display = 'flex';
                this.uiElements.choicesContainerFullScreen.style.opacity = '1';
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(menuWrapper);
            }
        }

        // 3. Menú flotante
        if (floatingOptions.length > 0 && this.uiElements.choicesContainerMenu) {
            const floatingWrapper = document.createElement('div');
            floatingWrapper.className = 'menu-wrapper menu-floating-container';

            for (const option of floatingOptions) {
                const button = await this._createChoiceButton(option, floatingWrapper, sceneName, command, isGlobal);
                floatingWrapper.appendChild(button);
            }

            if (!isGlobal) {
                this.uiElements.choicesContainerMenu.appendChild(floatingWrapper);
                this.uiElements.choicesContainerMenu.style.display = 'flex';
                this.uiElements.choicesContainerMenu.style.opacity = '1';
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(floatingWrapper);
            }
        }

        // 4. Opciones posicionadas
        if (positionedOptions.length > 0 && this.uiElements.choicesContainerFullScreen) {
            const positionedWrapper = document.createElement('div');
            positionedWrapper.className = 'menu-wrapper menu-positioned-container';

            for (const option of positionedOptions) {
                const button = await this._createChoiceButton(option, undefined, sceneName, command, isGlobal);
                button.style.position = 'absolute';
                button.style.left = `${option.xpos}%`;
                button.style.bottom = `${option.ypos}%`;

                if (option.heightPercent || option.widthPercent) {
                    button.style.height = option.heightPercent ? `${option.heightPercent}%` : 'auto';
                    button.style.width = option.widthPercent ? `${option.widthPercent}%` : 'auto';
                    button.style.background = 'none';
                    button.classList.add('btnlayout');
                }

                positionedWrapper.appendChild(button);
            }

            if (!isGlobal) {
                this.uiElements.choicesContainerFullScreen.appendChild(positionedWrapper);
                this.uiElements.choicesContainerFullScreen.style.display = 'flex';
                this.uiElements.choicesContainerFullScreen.style.opacity = '1';
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(positionedWrapper);
            }
        }

        // 5. Opciones normales (centradas) - BLOQUEAN EL FLUJO
        if (defaultOptions.length > 0 && this.uiElements.choicesContainer) {
            const defaultWrapper = document.createElement('div');
            defaultWrapper.className = 'menu-wrapper default-choice-wrapper';
            defaultWrapper.style.display = 'flex';
            defaultWrapper.style.flexDirection = 'column';
            defaultWrapper.style.gap = '10px';

            for (const option of defaultOptions) {
                const button = await this._createChoiceButton(option, defaultWrapper, sceneName, command, isGlobal);
                defaultWrapper.appendChild(button);
            }

            if (!isGlobal) {
                this.uiElements.choicesContainer.appendChild(defaultWrapper);
                this.uiElements.choicesContainer.style.display = 'flex';
                this.uiElements.choicesContainer.style.opacity = '1';
            } else {
                this.uiElements.gloablMenuContainer?.appendChild(defaultWrapper);
            }

            // Esperar selección (COMPATIBLE)
            // ✅ CORRECCIÓN: Esperar evento 'choice-action-complete' en lugar de solo click
            await new Promise(resolve => {
                const buttons = defaultWrapper.querySelectorAll("button");

                const actionCompleteHandler = () => {
                    // Remover listeners de todos los botones
                    buttons.forEach(btn => {
                        btn.removeEventListener("click", clickHandler);
                        btn.removeEventListener("choice-action-complete", actionCompleteHandler);
                    });
                    resolve(true);
                };

                const clickHandler = () => {
                    // No resolver aquí, esperar el evento de acción completada
                };

                buttons.forEach(btn => {
                    btn.addEventListener("click", clickHandler);
                    btn.addEventListener("choice-action-complete", actionCompleteHandler);
                });
            });
        }
    }

    /**
     * Crea un botón de opción
     * @private
     * @param {import('../VisualNovelEngine.js').ChoiceOption} option 
     * @param {HTMLElement | undefined} menuWrapper 
     * @param {string | number | null} sceneName 
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @param {boolean} isGlobal 
     * @returns {Promise<HTMLButtonElement>}
     */
    async _createChoiceButton(option, menuWrapper, sceneName, command, isGlobal) {
        const button = document.createElement("button");

        // Mantener las clases originales según el tipo de menú
        if (option.typeMenu === "TAB") {
            button.className = "choice-button menu-tab-item";
        } else if (option.typeMenu === "MENU") {
            button.className = "choice-button menu-item";
        } else if (option.xpos !== undefined && option.ypos !== undefined) {
            button.className = "choice-button positioned-choice";
        } else if (option.typeMenu === "FLOATING") {
            button.className = "choice-button menu-floating-item";
        } else {
            button.className = "choice-button";
        }

        if (button.className != "choice-button positioned-choice") {
            const label = document.createElement("label");
            label.innerText = option.text;
            button.appendChild(label);
        }

        // Agregar icono si existe
        if (option.icon) {
            let validImage = await this.engine.loadImageWithExtensions(option.icon);
            const icon = document.createElement("img");
            if (validImage) {
                icon.src = validImage;
            }
            icon.className = "menu-icon";
            button.prepend(icon);
        }

        // ✅ CORRECCIÓN CRÍTICA: Acción al hacer click
        button.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            this.ActualMenu = command;

            if (menuWrapper) {
                menuWrapper.remove();
            }
            button.classList.add("fade-out");

            // ✅ Solo marcar jumpTriggered si es menú global
            // @ts-ignore
            if (button.parentNode?.parentNode?.id == "global-choices-container-menu") {
                this.jumpTriggered = true;
            }

            // ✅ CORRECCIÓN: Si hay acción, ESPERAR a que termine ANTES de continuar
            if (option.action && Array.isArray(option.action) && option.action.length > 0) {
                try {
                    // Ejecutar la acción y ESPERAR a que termine completamente
                    await this.engine.executeBlock(option.action, sceneName);
                } catch (error) {
                    console.error("Error ejecutando acción de choice:", error);
                }
            }

            // ✅ Disparar evento personalizado para resolver la promesa de showChoices
            // Esto asegura que showChoices solo continúe DESPUÉS de que la acción termine
            button.dispatchEvent(new CustomEvent('choice-action-complete', { bubbles: true }));
        });

        return button;
    }

    /**
     * Limpia todos los menús (COMPATIBLE)
     */
    clearMenus(fullMenu = false) {
        this.uiElements.gameContainer?.querySelectorAll('.menu-wrapper').forEach(menu => {
            // @ts-ignore
            if (menu?.parentNode?.id == 'global-choices-container-menu') {
                return;
            }
            // @ts-ignore
            menu.style.opacity = '0';
            setTimeout(() => { menu.remove(); }, 1000);
        });

        if (fullMenu) {
            this.uiElements.gameContainer?.querySelectorAll('.menu-tab-containerr').forEach(menu => {
                // @ts-ignore
                menu.style.opacity = '0';
                setTimeout(() => { menu.remove(); }, 1000);
            });
        }

        if (this.uiElements.choicesContainerFullScreen) {
            this.uiElements.choicesContainerFullScreen.style.opacity = '0';
        }
        if (this.uiElements.choicesContainer) {
            this.uiElements.choicesContainer.style.opacity = '0';
        }
        if (this.uiElements.choicesContainerMenu) {
            this.uiElements.choicesContainerMenu.style.opacity = '0';
        }
        if (this.uiElements.textContainer) {
            this.uiElements.textContainer.style.opacity = '0';
        }
    }

    /**
     * Cambia el fondo (COMPATIBLE)
     * @param {import('../VisualNovelEngine.js').SceneCommand} command 
     * @returns {Promise<void>}
     */
    async changeBackground(command) {

        const textBox = this.uiElements.textBox;
        const nameBox = this.uiElements.nameBox;
        const textContainer = this.uiElements.textContainer;

        if (!textBox || !nameBox || !textContainer) return;
        // Mostrar contenedor
        textContainer.style.opacity = '0';
        textBox.style.opacity = '0';
        textBox.textContent = '';
        nameBox.textContent = '';

        const background = this.uiElements.background;
        if (!background) return;
        this.audioManager.stopAll(); //TODO POR EL MOMENTO SOLO DEJAMOS UN AUDIO ACTIVO APARTE DEL BG

        const currentBg = background.querySelector('.background-image');
        const newBgContainer = document.createElement('div');
        newBgContainer.className = 'background-image';
        newBgContainer.style.position = 'absolute';
        newBgContainer.style.width = '100%';
        newBgContainer.style.height = '100%';
        newBgContainer.style.opacity = '0';
        let timeSceneOut = this.engine.autoPlayTimeOut;
        command.video = command.video ?? await this.engine.tryLoadVideo(command.image ?? "");
        // Video
        if (command.video) {
            const validVideoUrl = await this.engine.tryLoadVideo(command.video);
            if (validVideoUrl) {
                const video = document.createElement('video');
                video.src = validVideoUrl;
                video.autoplay = true;
                video.loop = command.loopScene ?? true;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';

                newBgContainer.appendChild(video);
                // Esperar a que carguen los metadatos
                await new Promise((resolve) => {
                    video.onloadedmetadata = () => {
                        // @ts-ignore
                        resolve();
                    };
                });

                // Aquí ya puedes obtener la duración
                const duration = video.duration;
                timeSceneOut = duration * 1000 - 500;
                try {
                    await video.play();
                } catch (err) {
                    console.warn('Video autoplay bloqueado:', err);
                }
            }
        }
        // Imagen
        else if (command.image) {
            let imageUrl = command.image;

            // Aplicar sufijo de tiempo (COMPATIBLE)
            if (command.isAffectedByTime) {
                const suffix = this.engine.getTimeSuffix();
                const match = imageUrl.match(/^(.*)(\.\w+)$/);
                if (match) {
                    imageUrl = `${match[1]}${suffix}${match[2]}`;
                } else {
                    imageUrl = `${imageUrl}${suffix}`;
                }
            }

            const validImage = await this.engine.loadImageWithExtensions(imageUrl);
            newBgContainer.style.backgroundImage = `url('${validImage}')`;
            newBgContainer.style.backgroundSize = 'cover';
            newBgContainer.style.backgroundPosition = 'center';
        }

        background.appendChild(newBgContainer);

        // Forzar reflow
        void newBgContainer.offsetWidth;

        // Transición
        currentBg?.classList.add('fade-out');
        setTimeout(() => currentBg?.remove(), 200);

        newBgContainer.style.opacity = '1';
        if (command.audio) {
            this.audioManager.stopAll()
            try {
                this.audioManager.playAudio(command.audio, command.loopScene ?? true)
            } catch (err) {
                console.warn("Error al reproducir audio:", err);
            }
        }
        if (this.engine.autoPlay) {
            await new Promise(resolve => setTimeout(resolve, timeSceneOut));
        } else {
            await new Promise(resolve => setTimeout(resolve, this.engine.transitionDuration));
        }
    }

    /**
     * @param {string} name
     * @param {string | HTMLImageElement | HTMLImageElement[] | (string | null)[]} imageSource
     * @param {string | undefined} position
     * @param {{ fps?: number | undefined; loop?: boolean | undefined; state?: string | undefined; } | undefined} options
     */
    renderCharacter(name, imageSource, position, options) {
        // @ts-ignore
        let element = new CharacterContainer(name, imageSource, position, options);

        this.uiElements.characterSprites?.appendChild(element);
        this.engine.activeCharacters.add(name);
    }

    /**
     * Oculta un personaje de la pantalla con una transición.
     * @param {string} character - El nombre o identificador del personaje a ocultar.
     */
    async hideCharacter(character) {
        /**@type {Array<CharacterContainer>} */
        // @ts-ignore
        const elements = this.uiElements
            .characterSprites?.querySelectorAll(`.character-${character}`) ?? [];

        if (!elements || elements.length === 0) return;
        for (const el of elements) {
            el.close();
        }
    }

    /**
     * Verifica si está esperando input
     * @returns {boolean}
     */
    isWaitingForInput() {
        return this._isWaitingForInput;
    }
}