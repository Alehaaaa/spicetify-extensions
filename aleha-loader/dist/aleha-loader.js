(async()=>{for(;!Spicetify.React||!Spicetify.ReactDOM;)await new Promise(e=>setTimeout(e,10));var a,s,l,r,i,o,e,t,n,d,c,u,p,f,m,g;async function h(){{for(var e;null==(e=null==(e=window.Spicetify)?void 0:e.Platform)||!e.History;)await new Promise(e=>setTimeout(e,300));function i(e){return e.toLowerCase().replace(/\s+/g,"-")}let n=JSON.parse(null!=(t=localStorage.getItem(g))?t:"{}");var t=await fetch(f).then(e=>e.json()).then(e=>e.filter(e=>"file"===e.type&&e.name.endsWith(".js")).map(e=>({name:e.name.replace(/\.js$/,""),raw:m+"/"+e.name})));let a=new u(p+" Loader","ale-loader-settings");t.forEach(e=>{let t=i(e.name);a.addToggle(t," • "+e.name,!1!==n[t],void 0,{onChange:e=>{n[t]=e.currentTarget.checked}})}),a.addButton("save-and-reload","Persist changes and reload Spotify","Save & Reload",()=>{localStorage.setItem(g,JSON.stringify(n)),window.location.reload()}),a.pushSettings(),await Promise.all(t.filter(e=>!1!==n[i(e.name)]).map(t=>fetch(t.raw).then(e=>e.text()).then(e=>{try{new Function(e)(),console.log("[Loader] loaded "+t.name)}catch(e){console.error("[Loader] failed "+t.name,e)}})))}await 0;t=document.createElement("style");t.textContent=`
  button[id="ale-loader-settings.save-and-reload"] {
    /* encore-text-body-small-bold */
    font-weight: 700;
    /* encore-text-body-small */
    font-family: var(--encore-body-font-stack);
    font-size:   var(--encore-text-size-smaller);

    /* e-9812-button--small */
    min-block-size: var(--encore-control-size-smaller);
    padding-block:  var(--encore-spacing-tighter-4);
    padding-inline: var(--encore-spacing-base);

    /* Button-buttonSecondary-small-useBrowserDefaultFocusStyle */
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    background-color: transparent;
    border-radius: var(--encore-button-corner-radius, 9999px);
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    touch-action: manipulation;
    transition-duration: var(--shortest-3);
    transition-timing-function: var(--productive);
    user-select: none;
    vertical-align: middle;
    will-change: transform;
    border: 1px solid var(--essential-subdued, #818181);
    color: var(--text-base, #000000);
    min-inline-size: 0px;
    display: inline-flex;
    -webkit-box-align: center;
    align-items: center;
    -webkit-box-pack: center;
    justify-content: center;
    transition-property: border-color, transform;
  }

  @supports (overflow-wrap:anywhere) {
    #ale-loader-settings.save-and-reload {
      overflow-wrap: anywhere;
    }
  }
`,document.head.appendChild(t)}a=Object.create,s=Object.defineProperty,l=Object.getOwnPropertyDescriptor,r=Object.getOwnPropertyNames,i=Object.getPrototypeOf,o=Object.prototype.hasOwnProperty,n=(e=(e,t)=>function(){return t||(0,e[r(e)[0]])((t={exports:{}}).exports,t),t.exports})({"external-global-plugin:react-dom"(e,t){t.exports=Spicetify.ReactDOM}}),d=(t=(e,t,n)=>(n=null!=e?a(i(e)):{},((t,n,a,i)=>{if(n&&"object"==typeof n||"function"==typeof n)for(let e of r(n))o.call(t,e)||e===a||s(t,e,{get:()=>n[e],enumerable:!(i=l(n,e))||i.enumerable});return t})(!t&&e&&e.__esModule?n:s(n,"default",{value:e,enumerable:!0}),e)))(e({"external-global-plugin:react"(e,t){t.exports=Spicetify.React}})()),c=t(n()),u=class{constructor(e,t,n={}){this.name=e,this.settingsId=t,this.initialSettingsFields=n,this.settingsFields=this.initialSettingsFields,this.setRerender=null,this.pushSettings=async()=>{for(Object.entries(this.settingsFields).forEach(([e,t])=>{"button"!==t.type&&void 0===this.getFieldValue(e)&&this.setFieldValue(e,t.defaultValue)});!Spicetify?.Platform?.History?.listen;)await new Promise(e=>setTimeout(e,100));this.stopHistoryListener&&this.stopHistoryListener(),this.stopHistoryListener=Spicetify.Platform.History.listen(e=>{"/preferences"===e.pathname&&this.render()}),"/preferences"===Spicetify.Platform.History.location.pathname&&await this.render()},this.rerender=()=>{this.setRerender&&this.setRerender(Math.random())},this.render=async()=>{for(;!document.getElementById("desktop.settings.selectLanguage");){if("/preferences"!==Spicetify.Platform.History.location.pathname)return;await new Promise(e=>setTimeout(e,100))}var e=document.querySelector(".main-view-container__scroll-node-child main div");if(!e)return console.error("[spcr-settings] settings container not found");let t=Array.from(e.children).find(e=>e.id===this.settingsId);t?console.log(t):((t=document.createElement("div")).id=this.settingsId,e.appendChild(t)),c.default.render(d.default.createElement(this.FieldsContainer,null),t)},this.addButton=(e,t,n,a,i)=>{this.settingsFields[e]={type:"button",description:t,value:n,events:{onClick:a,...i}}},this.addInput=(e,t,n,a,i,s)=>{this.settingsFields[e]={type:"input",description:t,defaultValue:n,inputType:i,events:{onChange:a,...s}}},this.addHidden=(e,t)=>{this.settingsFields[e]={type:"hidden",defaultValue:t}},this.addToggle=(e,t,n,a,i)=>{this.settingsFields[e]={type:"toggle",description:t,defaultValue:n,events:{onChange:a,...i}}},this.addDropDown=(e,t,n,a,i,s)=>{this.settingsFields[e]={type:"dropdown",description:t,defaultValue:n[a],options:n,events:{onSelect:i,...s}}},this.getFieldValue=e=>JSON.parse(Spicetify.LocalStorage.get(this.settingsId+"."+e)||"{}")?.value,this.setFieldValue=(e,t)=>{Spicetify.LocalStorage.set(this.settingsId+"."+e,JSON.stringify({value:t}))},this.FieldsContainer=()=>{var[e,t]=(0,d.useState)(0);return this.setRerender=t,d.default.createElement("div",{className:"x-settings-section",key:e},d.default.createElement("h2",{className:"TypeElement-cello-textBase-type"},this.name),Object.entries(this.settingsFields).map(([e,t])=>d.default.createElement(this.Field,{nameId:e,field:t})))},this.Field=n=>{var e=this.settingsId+"."+n.nameId;let t;if(t="button"===n.field.type?n.field.value:this.getFieldValue(n.nameId),"hidden"===n.field.type)return d.default.createElement(d.default.Fragment,null);let[a,i]=(0,d.useState)(t),s=e=>{void 0!==e&&(i(e),this.setFieldValue(n.nameId,e))};return d.default.createElement("div",{className:"x-settings-row"},d.default.createElement("div",{className:"x-settings-firstColumn"},d.default.createElement("label",{className:"TypeElement-viola-textSubdued-type",htmlFor:e},n.field.description||"")),d.default.createElement("div",{className:"x-settings-secondColumn"},"input"===n.field.type?d.default.createElement("input",{className:"x-settings-input",id:e,dir:"ltr",value:a,type:n.field.inputType||"text",...n.field.events,onChange:e=>{s(e.currentTarget.value);var t=n.field.events?.onChange;t&&t(e)}}):"button"===n.field.type?d.default.createElement("span",null,d.default.createElement("button",{id:e,className:"Button-sc-y0gtbx-0 Button-small-buttonSecondary-useBrowserDefaultFocusStyle x-settings-button",...n.field.events,onClick:e=>{s();var t=n.field.events?.onClick;t&&t(e)},type:"button"},a)):"toggle"===n.field.type?d.default.createElement("label",{className:"x-settings-secondColumn x-toggle-wrapper"},d.default.createElement("input",{id:e,className:"x-toggle-input",type:"checkbox",checked:a,...n.field.events,onClick:e=>{s(e.currentTarget.checked);var t=n.field.events?.onClick;t&&t(e)}}),d.default.createElement("span",{className:"x-toggle-indicatorWrapper"},d.default.createElement("span",{className:"x-toggle-indicator"}))):"dropdown"===n.field.type?d.default.createElement("select",{className:"main-dropDown-dropDown",id:e,...n.field.events,onChange:e=>{s(n.field.options[e.currentTarget.selectedIndex]);var t=n.field.events?.onChange;t&&t(e)}},n.field.options.map((e,t)=>d.default.createElement("option",{selected:e===a,value:t+1},e))):d.default.createElement(d.default.Fragment,null)))}}},f=`https://api.github.com/repos/${p="Alehaaaa"}/${e="spicetify-extensions"}/contents/extensions/aleha-loader`,m=`https://raw.githubusercontent.com/${p}/${e}/main/extensions/aleha-loader`,g="LoaderStates",(async()=>{await h()})()})();