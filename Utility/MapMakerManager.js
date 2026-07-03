//@ts-check
import { MapMaker } from "./MapMaker.js";
import { ComponentsManager, html, WRender } from "../Core/WDevCore/WModules/WComponentsTools.js";
import { css } from "../Core/WDevCore/WModules/WStyledRender.js";
import { WAppNavigator } from "../Core/WDevCore/WComponents/WAppNavigator.js";
import { WModalForm } from "../Core/WDevCore/WComponents/WModalForm.js";



class MapMakerManager extends HTMLElement {
    constructor() {
        super();
        this.append(this.CustomStyle);
        /**@type {Array<MapMaker>} */
        this.Maps = []

        this.MapSelector = html`<input type="file" accept="image/*"
            multiple onchange="${(/** @type {{ target: { files: Iterable<any> | ArrayLike<any>; }; }} */ ev) => {
                const files = Array.from(ev.target.files);
                files.forEach(file => {
                    this.AddAction(file);
                });
            }}">`
        this.AddBtn = html`<button class="Btn" onclick="${() => this.AddAction(undefined)}">
            Add Map
        </button>`
        this.TabContainer = WRender.Create({ className: "TabContainer", id: 'TabContainer' });
        this.Manager = new ComponentsManager({ MainContainer: this.TabContainer, SPAManage: false });
        this.OptionContainer = WRender.Create({ className: "OptionContainer" });
        this.OptionContainer.append(
            this.AddBtn,
            this.MapSelector           
        )
        this.append(this.OptionContainer, this.TabContainer)
        this.Draw();
        this.SelectedMap = null

    }
    AddAction = ( /** @type {any|undefined} */ file) => {
        const newMap = new MapMaker({
            portalAction: this.PortalAction,
            file: file
        })
        //newMap.mapNameInput.value = 
        newMap.processBackgroundFile(file);
        this.Maps.push(newMap);

        this.Manager.NavigateFunction(this.ExtractName(file), newMap);
        this.SelectedMap = newMap;
        this.RenderMapOptions()
    }

    RenderMapOptions = () => {
        this.OptionContainer.innerHTML = "";
        this.OptionContainer.append(
            this.AddBtn,
            this.MapSelector           
        )
        this.OptionContainer.append(...(this.Maps.map(map => {
            return html`<div class="option">
                <label for="radio_map${map.id}">Map ${map.id}</label>
                <input type="radio" id="radio_map${map.id}" checked name="maps" onchange="${() => {
                    this.Manager.NavigateFunction(map.id)
                    this.SelectedMap = map;
                }}" />
            </div>`
        })))
    }
    ExtractName(file) {
        return file.name.replaceAll(" ", "").replaceAll(".png", "").replaceAll(".jpg", "").replaceAll("(", "_").replaceAll(")", "");
    }

    connectedCallback() { }
    Draw = async () => { }

    update() {
        this.Draw();
    }
    PortalAction = (/** @type {{ actionConfig: { targetX: string | undefined; targetY: string | undefined; targetMap: string; }; }} */ portal) => {
        const Container = WRender.Create({
            className: "OptionContainer"
        });
        const OptionContainer = WRender.Create({
            className: "OptionContainer"
        });
        OptionContainer.style.display = "flex"
        const MapDiv = WRender.Create({ className: "MapDiv", style: { minHeight: "600px" } });
        const mapOptions = this.Maps.filter(map => map != this.SelectedMap).map(map => {
            return html`<div class="option">
                <input class="Btn" type="button" id="radio_map${map.id}"
                 value="Map ${map.id}"  
                 onclick="${() => {
                    this.ProccesGoToMap(map, portal, modal, MapDiv);
                    //this.Manager.NavigateFunction(map.id)
                }}" />
            </div>`
        })

        OptionContainer.append(...mapOptions)
        Container.append(OptionContainer)
        Container.append(MapDiv)
        Container.append(html`<button class="Btn" onclick="${() => {
            this.Maps.forEach(map => {
                map.CellAction = null
                map.generateCode()
            })
            modal.close()
        }}"> Aceptar </button>`)
        const modal = new WModalForm({
            ObjectModal: Container,
            CloseOption: false,
            FullScreen: true,
        })
        this.append(modal)
    }
    CustomStyle = css`
        .component{
            display: block;
        }       
        .OptionContainer {
            display: flex;
            gap: 10px;
            padding:10px;
            background-color: #fff;
            border-radius: 5px;
        }    
        .option,  .option label, .option input{
            cursor: pointer;
        }
        .option {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1rem;
            font-weight: 500;
            border: solid 1px #888;
            border-radius: 5px;
            padding: 0px 10px;
        }
     `

    /**
     * @param {MapMaker} map
     * @param {{ actionConfig: any; }} portal
     * @param {WModalForm} modal
     * @param {HTMLElement} MapDiv
     */
    ProccesGoToMap(map, portal, modal, MapDiv) {
        map.CellAction = (cell) => {
            console.log("cellAction", portal, cell);
            portal.actionConfig = {
                targetX: cell.dataset.x,
                targetY: cell.dataset.y,
                targetMap: map.mapNameInput.value
            };
            this.Maps.forEach(map => {
                map.CellAction = null;
                map.generateCode();
            });
            modal.close();
        };
        MapDiv.append(map);
    }
}
customElements.define('w-map-mak-component', MapMakerManager);
export { MapMakerManager }
