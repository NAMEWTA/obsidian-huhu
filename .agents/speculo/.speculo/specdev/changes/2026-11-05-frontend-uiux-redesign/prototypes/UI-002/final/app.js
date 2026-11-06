/* HUHU UI-002 final prototype script. Demo state only.
 *
 * Embedded third-party code:
 * - Air Datepicker 3.6.0 dist/air-datepicker.js (git blob e059549c90fb52bc4b63d2e5374b0ec08997cdd4) and
 *   dist/locale/zh.js (git blob 4a2b48ba4f8f736169c8e01ad97c8b4b9037d560), verbatim, from
 *   https://github.com/t1m0n/air-datepicker @ f2510b92d9cff5ae53d0f0ba3d8443be2eeba544.
 * - Lucide icon path data v0.577.0 (node_modules/lucide-react).
 *
 * ---- Air Datepicker LICENSE.md ----
The MIT License (MIT)

Copyright (c) Timofey Marochkin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 *
 * ---- Lucide LICENSE ----
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2026 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2026.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

---

The MIT License (MIT) (for portions derived from Feather)

Copyright (c) 2013-2026 Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
/* ===== vendor: air-datepicker.js (unmodified; UMD assigns window.AirDatepicker) ===== */
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.AirDatepicker=t():e.AirDatepicker=t()}(this,(function(){return function(){"use strict";var e={d:function(t,i){for(var s in i)e.o(i,s)&&!e.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:i[s]})},o:function(e,t){return Object.prototype.hasOwnProperty.call(e,t)}},t={};e.d(t,{default:function(){return R}});var i={days:"days",months:"months",years:"years",day:"day",month:"month",year:"year",eventChangeViewDate:"changeViewDate",eventChangeCurrentView:"changeCurrentView",eventChangeFocusDate:"changeFocusDate",eventChangeSelectedDate:"changeSelectedDate",eventChangeTime:"changeTime",eventChangeLastSelectedDate:"changeLastSelectedDate",actionSelectDate:"selectDate",actionUnselectDate:"unselectDate",cssClassWeekend:"-weekend-"},s={classes:"",inline:!1,locale:{days:["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"],daysShort:["Вос","Пон","Вто","Сре","Чет","Пят","Суб"],daysMin:["Вс","Пн","Вт","Ср","Чт","Пт","Сб"],months:["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"],monthsShort:["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"],today:"Сегодня",clear:"Очистить",dateFormat:"dd.MM.yyyy",timeFormat:"HH:mm",firstDay:1},startDate:new Date,firstDay:"",weekends:[6,0],dateFormat:"",altField:"",altFieldDateFormat:"T",toggleSelected:!0,keyboardNav:!0,selectedDates:!1,container:"",isMobile:!1,visible:!1,position:"bottom left",offset:12,view:i.days,minView:i.days,showOtherMonths:!0,selectOtherMonths:!0,moveToOtherMonthsOnSelect:!0,showOtherYears:!0,selectOtherYears:!0,moveToOtherYearsOnSelect:!0,minDate:"",maxDate:"",disableNavWhenOutOfRange:!0,multipleDates:!1,multipleDatesSeparator:", ",range:!1,dynamicRange:!0,buttons:!1,monthsField:"monthsShort",showEvent:"focus",autoClose:!1,fixedHeight:!1,prevHtml:'<svg><path d="M 17,12 l -5,5 l 5,5"></path></svg>',nextHtml:'<svg><path d="M 14,12 l 5,5 l -5,5"></path></svg>',navTitles:{days:"MMMM, <i>yyyy</i>",months:"yyyy",years:"yyyy1 - yyyy2"},timepicker:!1,onlyTimepicker:!1,dateTimeSeparator:" ",timeFormat:"",minHours:0,maxHours:24,minMinutes:0,maxMinutes:59,hoursStep:1,minutesStep:1,onSelect:!1,onChangeViewDate:!1,onChangeView:!1,onRenderCell:!1,onShow:!1,onHide:!1,onClickDayName:!1};function a(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:document;return"string"==typeof e?t.querySelector(e):e}function n(){let{tagName:e="div",className:t="",innerHtml:i="",id:s="",attrs:a={}}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=document.createElement(e);return t&&n.classList.add(...t.split(" ")),s&&(n.id=s),i&&(n.innerHTML=i),a&&r(n,a),n}function r(e,t){for(let[i,s]of Object.entries(t))void 0!==s&&e.setAttribute(i,s);return e}function h(e){return new Date(e.getFullYear(),e.getMonth()+1,0).getDate()}function o(e){let t=e.getHours(),{hours:i,dayPeriod:s}=l(t);return{year:e.getFullYear(),month:e.getMonth(),fullMonth:e.getMonth()+1<10?"0"+(e.getMonth()+1):e.getMonth()+1,date:e.getDate(),fullDate:e.getDate()<10?"0"+e.getDate():e.getDate(),day:e.getDay(),hours:t,fullHours:d(t),hours12:i,dayPeriod:s,fullHours12:d(i),minutes:e.getMinutes(),fullMinutes:e.getMinutes()<10?"0"+e.getMinutes():e.getMinutes()}}function l(e){return{dayPeriod:e>11?"pm":"am",hours:e%12==0?12:e%12}}function d(e){return e<10?"0"+e:e}function c(e){let t=10*Math.floor(e.getFullYear()/10);return[t,t+9]}function u(){let e=[];for(var t=arguments.length,i=new Array(t),s=0;s<t;s++)i[s]=arguments[s];return i.forEach((t=>{if("object"==typeof t)for(let i in t)t[i]&&e.push(i);else t&&e.push(t)})),e.join(" ")}function p(e,t){let s=arguments.length>2&&void 0!==arguments[2]?arguments[2]:i.days;if(!e||!t)return!1;let a=o(e),n=o(t);return{[i.days]:a.date===n.date&&a.month===n.month&&a.year===n.year,[i.months]:a.month===n.month&&a.year===n.year,[i.years]:a.year===n.year}[s]}function m(e,t,i){let s=g(e,!1).getTime(),a=g(t,!1).getTime();return i?s>=a:s>a}function v(e,t){return!m(e,t,!0)}function g(e){let t=!(arguments.length>1&&void 0!==arguments[1])||arguments[1],i=new Date(e.getTime());return"boolean"!=typeof t||t||function(e){e.setHours(0,0,0,0)}(i),i}function D(e,t,i){e.length?e.forEach((e=>{e.addEventListener(t,i)})):e.addEventListener(t,i)}function y(e,t){return!(!e||e===document||e instanceof DocumentFragment)&&(e.matches(t)?e:y(e.parentNode,t))}function f(e,t,i){return e>i?i:e<t?t:e}function w(e){for(var t=arguments.length,i=new Array(t>1?t-1:0),s=1;s<t;s++)i[s-1]=arguments[s];return i.filter((e=>e)).forEach((t=>{for(let[i,s]of Object.entries(t))if(void 0!==s&&"[object Object]"===s.toString()){let t=void 0!==e[i]?e[i].toString():void 0,a=s.toString(),n=Array.isArray(s)?[]:{};e[i]=e[i]?t!==a?n:e[i]:n,w(e[i],s)}else e[i]=s})),e}function b(e){let t=e;return e instanceof Date||("string"==typeof e&&/^\d{4}-\d{2}-\d{2}$/.test(e)&&(e+="T00:00:00"),t=new Date(e)),isNaN(t.getTime())&&(console.log(`Unable to convert value "${e}" to Date object`),t=!1),t}function $(e){let t="\\s|\\.|-|/|\\\\|,|\\$|\\!|\\?|:|;";return new RegExp("(^|>|"+t+")("+e+")($|<|"+t+")","g")}function k(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class C{constructor(){let{type:e,date:t,dp:i,opts:s,body:a}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};k(this,"focus",(()=>{this.$cell.classList.add("-focus-"),this.focused=!0})),k(this,"removeFocus",(()=>{this.$cell.classList.remove("-focus-"),this.focused=!1})),k(this,"select",(()=>{this.$cell.classList.add("-selected-"),this.selected=!0})),k(this,"removeSelect",(()=>{this.$cell.classList.remove("-selected-","-range-from-","-range-to-"),this.selected=!1})),k(this,"onChangeSelectedDate",(()=>{this.isDisabled||(this._handleSelectedStatus(),this.opts.range&&this._handleRangeStatus())})),k(this,"onChangeFocusDate",(e=>{if(!e)return void(this.focused&&this.removeFocus());let t=p(e,this.date,this.type);t?this.focus():!t&&this.focused&&this.removeFocus(),this.opts.range&&this._handleRangeStatus()})),k(this,"render",(()=>(this.$cell.innerHTML=this._getHtml(),this._handleClasses(),this.$cell))),this.type=e,this.singleType=this.type.slice(0,-1),this.date=t,this.dp=i,this.opts=s,this.body=a,this.customData=!1,this.init()}init(){var e,t;let{onRenderCell:i}=this.opts;i&&(this.customData=i({date:this.date,cellType:this.singleType,datepicker:this.dp})),this._createElement(),this._bindDatepickerEvents(),null!==(e=this.customData)&&void 0!==e&&e.disabled?this.dp.disableDate(this.date):!1===(null===(t=this.customData)||void 0===t?void 0:t.disabled)&&this.dp.enableDate(this.date)}_bindDatepickerEvents(){this.dp.on(i.eventChangeSelectedDate,this.onChangeSelectedDate),this.dp.on(i.eventChangeFocusDate,this.onChangeFocusDate)}unbindDatepickerEvents(){this.dp.off(i.eventChangeSelectedDate,this.onChangeSelectedDate),this.dp.off(i.eventChangeFocusDate,this.onChangeFocusDate)}_createElement(){var e;let{year:t,month:i,fullMonth:s,date:a,fullDate:r}=o(this.date),h=(null===(e=this.customData)||void 0===e?void 0:e.attrs)||{};this.$cell=n({attrs:{"data-year":t,"data-month":i,"data-date":a,"data-iso-date":`${t}-${s}-${r}`,...h}}),this.$cell.adpCell=this}_getClassName(){var e;let t=new Date,{selectOtherMonths:s,selectOtherYears:a}=this.opts,{minDate:n,maxDate:r,isDateDisabled:h}=this.dp,{day:l}=o(this.date),d=this._isOutOfMinMaxRange(),c=h(this.date),m=u("air-datepicker-cell",`-${this.singleType}-`,{"-current-":p(t,this.date,this.type),"-min-date-":n&&p(n,this.date,this.type),"-max-date-":r&&p(r,this.date,this.type)}),v="";switch(this.type){case i.days:v=u({"-weekend-":this.dp.isWeekend(l),"-other-month-":this.isOtherMonth,"-disabled-":this.isOtherMonth&&!s||d||c});break;case i.months:v=u({"-disabled-":d});break;case i.years:v=u({"-other-decade-":this.isOtherDecade,"-disabled-":d||this.isOtherDecade&&!a})}return u(m,v,null===(e=this.customData)||void 0===e?void 0:e.classes).split(" ")}_getHtml(){var e;let{year:t,month:s,date:a}=o(this.date),{showOtherMonths:n,showOtherYears:r}=this.opts;if(null!==(e=this.customData)&&void 0!==e&&e.html)return this.customData.html;switch(this.type){case i.days:return!n&&this.isOtherMonth?"":a;case i.months:return this.dp.locale[this.opts.monthsField][s];case i.years:return!r&&this.isOtherDecade?"":t}}_isOutOfMinMaxRange(){let{minDate:e,maxDate:t}=this.dp,{type:s,date:a}=this,{month:n,year:r,date:h}=o(a),l=s===i.days,d=s===i.years,c=!!e&&new Date(r,d?e.getMonth():n,l?h:e.getDate()),u=!!t&&new Date(r,d?t.getMonth():n,l?h:t.getDate());return e&&t?v(c,e)||m(u,t):e?v(c,e):t?m(u,t):void 0}destroy(){this.unbindDatepickerEvents()}_handleRangeStatus(){const{selectedDates:e,focusDate:t,rangeDateTo:i,rangeDateFrom:s}=this.dp,a=e.length;if(this.$cell.classList.remove("-range-from-","-range-to-","-in-range-"),!a)return;let n=s,r=i;if(1===a&&t){const i=m(t,e[0]);n=i?e[0]:t,r=i?t:e[0]}let h=u({"-in-range-":n&&r&&(o=this.date,l=n,d=r,m(o,l)&&v(o,d)),"-range-from-":n&&p(this.date,n,this.type),"-range-to-":r&&p(this.date,r,this.type)});var o,l,d;h&&this.$cell.classList.add(...h.split(" "))}_handleSelectedStatus(){let e=this.dp._checkIfDateIsSelected(this.date,this.type);e?this.select():!e&&this.selected&&this.removeSelect()}_handleInitialFocusStatus(){p(this.dp.focusDate,this.date,this.type)&&this.focus()}_handleClasses(){this.$cell.setAttribute("class",""),this._handleInitialFocusStatus(),this.dp.hasSelectedDates&&(this._handleSelectedStatus(),this.dp.opts.range&&this._handleRangeStatus()),this.$cell.classList.add(...this._getClassName())}get isDisabled(){return this.$cell.matches(".-disabled-")}get isOtherMonth(){return this.dp.isOtherMonth(this.date)}get isOtherDecade(){return this.dp.isOtherDecade(this.date)}}function _(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}let M={[i.days]:`<div class="air-datepicker-body--day-names"></div><div class="air-datepicker-body--cells -${i.days}-"></div>`,[i.months]:`<div class="air-datepicker-body--cells -${i.months}-"></div>`,[i.years]:`<div class="air-datepicker-body--cells -${i.years}-"></div>`};const S=".air-datepicker-cell";class T{constructor(e){let{dp:t,type:s,opts:a}=e;_(this,"handleClick",(e=>{let t=e.target.closest(S).adpCell;if(t.isDisabled)return;if(!this.dp.isMinViewReached)return void this.dp.down();let i=this.dp._checkIfDateIsSelected(t.date,t.type);i?this.dp._handleAlreadySelectedDates(i,t.date):this.dp.selectDate(t.date)})),_(this,"handleDayNameClick",(e=>{let t=e.target.getAttribute("data-day-index");this.opts.onClickDayName({dayIndex:Number(t),datepicker:this.dp})})),_(this,"onChangeCurrentView",(e=>{e!==this.type?this.hide():(this.show(),this.render())})),_(this,"onMouseOverCell",(e=>{let t=y(e.target,S);this.dp.setFocusDate(!!t&&t.adpCell.date)})),_(this,"onMouseOutCell",(()=>{this.dp.setFocusDate(!1)})),_(this,"onClickBody",(e=>{let{onClickDayName:t}=this.opts,i=e.target;i.closest(S)&&this.handleClick(e),t&&i.closest(".air-datepicker-body--day-name")&&this.handleDayNameClick(e)})),_(this,"onMouseDown",(e=>{this.pressed=!0;let t=y(e.target,S),i=t&&t.adpCell;p(i.date,this.dp.rangeDateFrom)&&(this.rangeFromFocused=!0),p(i.date,this.dp.rangeDateTo)&&(this.rangeToFocused=!0)})),_(this,"onMouseMove",(e=>{if(!this.pressed||!this.dp.isMinViewReached)return;e.preventDefault();let t=y(e.target,S),i=t&&t.adpCell,{selectedDates:s,rangeDateTo:a,rangeDateFrom:n}=this.dp;if(!i||i.isDisabled)return;let{date:r}=i;if(2===s.length){if(this.rangeFromFocused&&!m(r,a)){let{hours:e,minutes:t}=o(n);r.setHours(e),r.setMinutes(t),this.dp.rangeDateFrom=r,this.dp.replaceDate(n,r)}if(this.rangeToFocused&&!v(r,n)){let{hours:e,minutes:t}=o(a);r.setHours(e),r.setMinutes(t),this.dp.rangeDateTo=r,this.dp.replaceDate(a,r)}}})),_(this,"onMouseUp",(()=>{this.pressed=!1,this.rangeFromFocused=!1,this.rangeToFocused=!1})),_(this,"onChangeViewDate",((e,t)=>{if(!this.isVisible)return;let s=c(e),a=c(t);switch(this.dp.currentView){case i.days:if(p(e,t,i.months))return;break;case i.months:if(p(e,t,i.years))return;break;case i.years:if(s[0]===a[0]&&s[1]===a[1])return}this.render()})),_(this,"render",(()=>{this.destroyCells(),this._generateCells(),this.cells.forEach((e=>{this.$cells.appendChild(e.render())}))})),this.dp=t,this.type=s,this.opts=a,this.cells=[],this.$el="",this.pressed=!1,this.isVisible=!0,this.init()}init(){this._buildBaseHtml(),this.type===i.days&&this.renderDayNames(),this.render(),this._bindEvents(),this._bindDatepickerEvents()}_bindEvents(){let{range:e,dynamicRange:t}=this.opts;D(this.$el,"mouseover",this.onMouseOverCell),D(this.$el,"mouseout",this.onMouseOutCell),D(this.$el,"click",this.onClickBody),e&&t&&(D(this.$el,"mousedown",this.onMouseDown),D(this.$el,"mousemove",this.onMouseMove),D(window.document,"mouseup",this.onMouseUp))}_bindDatepickerEvents(){this.dp.on(i.eventChangeViewDate,this.onChangeViewDate),this.dp.on(i.eventChangeCurrentView,this.onChangeCurrentView)}_buildBaseHtml(){this.$el=n({className:`air-datepicker-body -${this.type}-`,innerHtml:M[this.type]}),this.$names=a(".air-datepicker-body--day-names",this.$el),this.$cells=a(".air-datepicker-body--cells",this.$el)}_getDayNamesHtml(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.dp.locale.firstDay,t="",s=this.dp.isWeekend,{onClickDayName:a}=this.opts,n=e,r=0;for(;r<7;){let e=n%7;t+=`<div class="${u("air-datepicker-body--day-name",{[i.cssClassWeekend]:s(e),"-clickable-":!!a})}" data-day-index='${e}'>${this.dp.locale.daysMin[e]}</div>`,r++,n++}return t}renderDayNames(){this.$names.innerHTML=this._getDayNamesHtml()}_generateCell(e){let{type:t,dp:i,opts:s}=this;return new C({type:t,dp:i,opts:s,date:e,body:this})}_generateCells(){T.getDatesFunction(this.type)(this.dp,(e=>{this.cells.push(this._generateCell(e))}))}show(){this.isVisible=!0,this.$el.classList.remove("-hidden-")}hide(){this.isVisible=!1,this.$el.classList.add("-hidden-")}destroyCells(){this.cells.forEach((e=>e.destroy())),this.cells=[],this.$cells.innerHTML=""}destroy(){this.destroyCells(),this.dp.off(i.eventChangeViewDate,this.onChangeViewDate),this.dp.off(i.eventChangeCurrentView,this.onChangeCurrentView)}static getDaysDates(e,t){let{viewDate:i,opts:{fixedHeight:s},locale:{firstDay:a}}=e,n=h(i),{year:r,month:l}=o(i),d=new Date(r,l,1),c=new Date(r,l,n),u=d.getDay()-a,p=6-c.getDay()+a;u=u<0?u+7:u,p=p>6?p-7:p;let m=function(e,t){let{year:i,month:s,date:a}=o(e);return new Date(i,s,a-t)}(d,u),v=n+u+p,g=m.getDate(),{year:D,month:y}=o(m),f=0;s&&(v=42);const w=[];for(;f<v;){let e=new Date(D,y,g+f);t&&t(e),w.push(e),f++}return w}static getMonthsDates(e,t){let{year:i}=e.parsedViewDate,s=0,a=[];for(;s<12;){const e=new Date(i,s);a.push(e),t&&t(e),s++}return a}static getYearsDates(e,t){let i=c(e.viewDate),s=i[0]-1,a=i[1]+1,n=s,r=[];for(;n<=a;){const e=new Date(n,0);r.push(e),t&&t(e),n++}return r}static getDatesFunction(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:i.days;return{[i.days]:T.getDaysDates,[i.months]:T.getMonthsDates,[i.years]:T.getYearsDates}[e]}}function F(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class V{constructor(e){let{dp:t,opts:i}=e;F(this,"onClickNav",(e=>{let t=y(e.target,".air-datepicker-nav--action");if(!t)return;let i=t.dataset.action;this.dp[i]()})),F(this,"onChangeViewDate",(()=>{this.render(),this._resetNavStatus(),this.handleNavStatus()})),F(this,"onChangeCurrentView",(()=>{this.render(),this._resetNavStatus(),this.handleNavStatus()})),F(this,"onClickNavTitle",(()=>{this.dp.isFinalView||this.dp.up()})),F(this,"update",(()=>{let{prevHtml:e,nextHtml:t}=this.opts;this.$prev.innerHTML=e,this.$next.innerHTML=t,this._resetNavStatus(),this.render(),this.handleNavStatus()})),F(this,"renderDelay",(()=>{setTimeout(this.render)})),F(this,"render",(()=>{this.$title.innerHTML=this._getTitle(),function(e,t){for(let i in t)t[i]?e.classList.add(i):e.classList.remove(i)}(this.$title,{"-disabled-":this.dp.isFinalView})})),this.dp=t,this.opts=i,this.init()}init(){this._createElement(),this._buildBaseHtml(),this._defineDOM(),this.render(),this.handleNavStatus(),this._bindEvents(),this._bindDatepickerEvents()}_defineDOM(){this.$title=a(".air-datepicker-nav--title",this.$el),this.$prev=a('[data-action="prev"]',this.$el),this.$next=a('[data-action="next"]',this.$el)}_bindEvents(){this.$el.addEventListener("click",this.onClickNav),this.$title.addEventListener("click",this.onClickNavTitle)}_bindDatepickerEvents(){this.dp.on(i.eventChangeViewDate,this.onChangeViewDate),this.dp.on(i.eventChangeCurrentView,this.onChangeCurrentView),this.isNavIsFunction&&(this.dp.on(i.eventChangeSelectedDate,this.renderDelay),this.dp.opts.timepicker&&this.dp.on(i.eventChangeTime,this.render))}destroy(){this.dp.off(i.eventChangeViewDate,this.onChangeViewDate),this.dp.off(i.eventChangeCurrentView,this.onChangeCurrentView),this.isNavIsFunction&&(this.dp.off(i.eventChangeSelectedDate,this.renderDelay),this.dp.opts.timepicker&&this.dp.off(i.eventChangeTime,this.render))}_createElement(){this.$el=n({tagName:"nav",className:"air-datepicker-nav"})}_getTitle(){let{dp:e,opts:t}=this,i=t.navTitles[e.currentView];return"function"==typeof i?i(e):e.formatDate(e.viewDate,i)}handleNavStatus(){let{disableNavWhenOutOfRange:e}=this.opts,{minDate:t,maxDate:s}=this.dp;if(!t&&!s||!e)return;let{year:a,month:n}=this.dp.parsedViewDate,r=!!t&&o(t),h=!!s&&o(s);switch(this.dp.currentView){case i.days:t&&r.month>=n&&r.year>=a&&this._disableNav("prev"),s&&h.month<=n&&h.year<=a&&this._disableNav("next");break;case i.months:t&&r.year>=a&&this._disableNav("prev"),s&&h.year<=a&&this._disableNav("next");break;case i.years:{let e=c(this.dp.viewDate);t&&r.year>=e[0]&&this._disableNav("prev"),s&&h.year<=e[1]&&this._disableNav("next");break}}}_disableNav(e){a('[data-action="'+e+'"]',this.$el).classList.add("-disabled-")}_resetNavStatus(){!function(e){for(var t=arguments.length,i=new Array(t>1?t-1:0),s=1;s<t;s++)i[s-1]=arguments[s];e.length?e.forEach((e=>{e.classList.remove(...i)})):e.classList.remove(...i)}(this.$el.querySelectorAll(".air-datepicker-nav--action"),"-disabled-")}_buildBaseHtml(){let{prevHtml:e,nextHtml:t}=this.opts;this.$el.innerHTML=`<div class="air-datepicker-nav--action" data-action="prev">${e}</div><div class="air-datepicker-nav--title"></div><div class="air-datepicker-nav--action" data-action="next">${t}</div>`}get isNavIsFunction(){let{navTitles:e}=this.opts;return Object.keys(e).find((t=>"function"==typeof e[t]))}}var x={today:{content:e=>e.locale.today,onClick:e=>e.setViewDate(new Date)},clear:{content:e=>e.locale.clear,onClick:e=>e.clear()}};class H{constructor(e){let{dp:t,opts:i}=e;this.dp=t,this.opts=i,this.init()}init(){this.createElement(),this.render()}createElement(){this.$el=n({className:"air-datepicker-buttons"})}destroy(){this.$el.parentNode.removeChild(this.$el)}clearHtml(){return this.$el.innerHTML="",this}generateButtons(){let{buttons:e}=this.opts;Array.isArray(e)||(e=[e]),e.forEach((e=>{let t=e;"string"==typeof e&&x[e]&&(t=x[e]);let i=this.createButton(t);t.onClick&&this.attachEventToButton(i,t.onClick),this.$el.appendChild(i)}))}attachEventToButton(e,t){e.addEventListener("click",(()=>{t(this.dp)}))}createButton(e){let{content:t,className:i,tagName:s="button",attrs:a={}}=e;return n({tagName:s,innerHtml:`<span tabindex='-1'>${"function"==typeof t?t(this.dp):t}</span>`,className:u("air-datepicker-button",i),attrs:a})}render(){this.generateButtons()}}function E(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class L{constructor(){let{opts:e,dp:t}=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};E(this,"toggleTimepickerIsActive",(e=>{this.dp.timepickerIsActive=e})),E(this,"onChangeSelectedDate",(e=>{let{date:t,updateTime:i=!1}=e;t&&(this.setMinMaxTime(t),this.setCurrentTime(!!i&&t),this.addTimeToDate(t))})),E(this,"onChangeLastSelectedDate",(e=>{e&&(this.setTime(e),this.render())})),E(this,"onChangeInputRange",(e=>{let t=e.target;this[t.getAttribute("name")]=t.value,this.updateText(),this.dp.trigger(i.eventChangeTime,{hours:this.hours,minutes:this.minutes})})),E(this,"onMouseEnterLeave",(e=>{let t=e.target.getAttribute("name"),i=this.$minutesText;"hours"===t&&(i=this.$hoursText),i.classList.toggle("-focus-")})),E(this,"onFocus",(()=>{this.toggleTimepickerIsActive(!0)})),E(this,"onBlur",(()=>{this.toggleTimepickerIsActive(!1)})),this.opts=e,this.dp=t;let{timeFormat:s}=this.dp.locale;s&&(s.match($("h"))||s.match($("hh")))&&(this.ampm=!0),this.init()}init(){this.setTime(this.dp.lastSelectedDate||this.dp.viewDate),this.createElement(),this.buildHtml(),this.defineDOM(),this.render(),this.bindDatepickerEvents(),this.bindDOMEvents()}bindDatepickerEvents(){this.dp.on(i.eventChangeSelectedDate,this.onChangeSelectedDate),this.dp.on(i.eventChangeLastSelectedDate,this.onChangeLastSelectedDate)}bindDOMEvents(){let e="input";navigator.userAgent.match(/trident/gi)&&(e="change"),D(this.$ranges,e,this.onChangeInputRange),D(this.$ranges,"mouseenter",this.onMouseEnterLeave),D(this.$ranges,"mouseleave",this.onMouseEnterLeave),D(this.$ranges,"focus",this.onFocus),D(this.$ranges,"mousedown",this.onFocus),D(this.$ranges,"blur",this.onBlur)}createElement(){this.$el=n({className:u("air-datepicker-time",{"-am-pm-":this.dp.ampm})})}destroy(){this.dp.off(i.eventChangeSelectedDate,this.onChangeSelectedDate),this.dp.off(i.eventChangeLastSelectedDate,this.onChangeLastSelectedDate),this.$el.parentNode.removeChild(this.$el)}buildHtml(){let{ampm:e,hours:t,displayHours:i,minutes:s,minHours:a,minMinutes:n,maxHours:r,maxMinutes:h,dayPeriod:o,opts:{hoursStep:l,minutesStep:c}}=this;this.$el.innerHTML=`<div class="air-datepicker-time--current">   <span class="air-datepicker-time--current-hours">${d(i)}</span>   <span class="air-datepicker-time--current-colon">:</span>   <span class="air-datepicker-time--current-minutes">${d(s)}</span>   `+(e?`<span class='air-datepicker-time--current-ampm'>${o}</span>`:"")+'</div><div class="air-datepicker-time--sliders">   <div class="air-datepicker-time--row">'+`      <input type="range" name="hours" value="${t}" min="${a}" max="${r}" step="${l}"/>   </div>   <div class="air-datepicker-time--row">`+`      <input type="range" name="minutes" value="${s}" min="${n}" max="${h}" step="${c}"/>   </div></div>`}defineDOM(){let e=e=>a(e,this.$el);this.$ranges=this.$el.querySelectorAll('[type="range"]'),this.$hours=e('[name="hours"]'),this.$minutes=e('[name="minutes"]'),this.$hoursText=e(".air-datepicker-time--current-hours"),this.$minutesText=e(".air-datepicker-time--current-minutes"),this.$ampm=e(".air-datepicker-time--current-ampm")}setTime(e){this.setMinMaxTime(e),this.setCurrentTime(e)}addTimeToDate(e){e&&(e.setHours(this.hours),e.setMinutes(this.minutes))}setMinMaxTime(e){if(this.setMinMaxTimeFromOptions(),e){let{minDate:t,maxDate:i}=this.dp;t&&p(e,t)&&this.setMinTimeFromMinDate(t),i&&p(e,i)&&this.setMaxTimeFromMaxDate(i)}}setCurrentTime(e){let{hours:t,minutes:i}=e?o(e):this;this.hours=f(t,this.minHours,this.maxHours),this.minutes=f(i,this.minMinutes,this.maxMinutes)}setMinMaxTimeFromOptions(){let{minHours:e,minMinutes:t,maxHours:i,maxMinutes:s}=this.opts;this.minHours=f(e,0,23),this.minMinutes=f(t,0,59),this.maxHours=f(i,0,23),this.maxMinutes=f(s,0,59)}setMinTimeFromMinDate(e){let{lastSelectedDate:t}=this.dp;this.minHours=e.getHours(),t&&t.getHours()>e.getHours()?this.minMinutes=this.opts.minMinutes:this.minMinutes=e.getMinutes()}setMaxTimeFromMaxDate(e){let{lastSelectedDate:t}=this.dp;this.maxHours=e.getHours(),t&&t.getHours()<e.getHours()?this.maxMinutes=this.opts.maxMinutes:this.maxMinutes=e.getMinutes()}updateSliders(){r(this.$hours,{min:this.minHours,max:this.maxHours}).value=this.hours,r(this.$minutes,{min:this.minMinutes,max:this.maxMinutes}).value=this.minutes}updateText(){this.$hoursText.innerHTML=d(this.displayHours),this.$minutesText.innerHTML=d(this.minutes),this.ampm&&(this.$ampm.innerHTML=this.dayPeriod)}set hours(e){this._hours=e;let{hours:t,dayPeriod:i}=l(e);this.displayHours=this.ampm?t:e,this.dayPeriod=i}get hours(){return this._hours}render(){this.updateSliders(),this.updateText()}}function A(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}class O{constructor(e){let{dp:t,opts:i}=e;A(this,"pressedKeys",new Set),A(this,"hotKeys",new Map([[[["Control","ArrowRight"],["Control","ArrowUp"]],e=>e.month++],[[["Control","ArrowLeft"],["Control","ArrowDown"]],e=>e.month--],[[["Shift","ArrowRight"],["Shift","ArrowUp"]],e=>e.year++],[[["Shift","ArrowLeft"],["Shift","ArrowDown"]],e=>e.year--],[[["Alt","ArrowRight"],["Alt","ArrowUp"]],e=>e.year+=10],[[["Alt","ArrowLeft"],["Alt","ArrowDown"]],e=>e.year-=10],[["Control","Shift","ArrowUp"],(e,t)=>t.up()]])),A(this,"handleHotKey",(e=>{let t=this.hotKeys.get(e),i=o(this.getInitialFocusDate());t(i,this.dp);let{year:s,month:a,date:n}=i,r=h(new Date(s,a));r<n&&(n=r);let l=this.dp.getClampedDate(new Date(s,a,n));this.dp.setFocusDate(l,{viewDateTransition:!0})})),A(this,"isHotKeyPressed",(()=>{let e=!1,t=this.pressedKeys.size,i=e=>this.pressedKeys.has(e);for(let[s]of this.hotKeys){if(e)break;if(Array.isArray(s[0]))s.forEach((a=>{e||t!==a.length||(e=a.every(i)&&s)}));else{if(t!==s.length)continue;e=s.every(i)&&s}}return e})),A(this,"isArrow",(e=>e>=37&&e<=40)),A(this,"onKeyDown",(e=>{if(!this.dp.visible&&!this.dp.treatAsInline)return;let{key:t,which:i}=e,{dp:s,dp:{focusDate:a},opts:n}=this;this.registerKey(t);let r=this.isHotKeyPressed();if(r)return e.preventDefault(),void this.handleHotKey(r);if(this.isArrow(i))return e.preventDefault(),void this.focusNextCell(t);if("Enter"===t){if(s.currentView!==n.minView)return void s.down();if(a){let e=s._checkIfDateIsSelected(a);return void(e?s._handleAlreadySelectedDates(e,a):s.selectDate(a))}}"Escape"===t&&this.dp.hide()})),A(this,"onKeyUp",(e=>{this.removeKey(e.key)})),this.dp=t,this.opts=i,this.init()}init(){this.bindKeyboardEvents()}bindKeyboardEvents(){let{$el:e}=this.dp;e.addEventListener("keydown",this.onKeyDown),e.addEventListener("keyup",this.onKeyUp)}destroy(){let{$el:e}=this.dp;e.removeEventListener("keydown",this.onKeyDown),e.removeEventListener("keyup",this.onKeyUp),this.hotKeys=null,this.pressedKeys=null}getInitialFocusDate(){let{focusDate:e,currentView:t,selectedDates:s,parsedViewDate:{year:a,month:n}}=this.dp,r=e||s[s.length-1];if(!r)switch(t){case i.days:r=new Date(a,n,(new Date).getDate());break;case i.months:r=new Date(a,n,1);break;case i.years:r=new Date(a,0,1)}return r}focusNextCell(e){let t=this.getInitialFocusDate(),{currentView:s}=this.dp,{days:a,months:n,years:r}=i,h=o(t),l=h.year,d=h.month,c=h.date;switch(e){case"ArrowLeft":s===a&&(c-=1),s===n&&(d-=1),s===r&&(l-=1);break;case"ArrowUp":s===a&&(c-=7),s===n&&(d-=3),s===r&&(l-=4);break;case"ArrowRight":s===a&&(c+=1),s===n&&(d+=1),s===r&&(l+=1);break;case"ArrowDown":s===a&&(c+=7),s===n&&(d+=3),s===r&&(l+=4)}let u=this.dp.getClampedDate(new Date(l,d,c));this.dp.setFocusDate(u,{viewDateTransition:!0})}registerKey(e){this.pressedKeys.add(e)}removeKey(e){this.pressedKeys.delete(e)}}let N={on(e,t){this.__events||(this.__events={}),this.__events[e]?this.__events[e].push(t):this.__events[e]=[t]},off(e,t){this.__events&&this.__events[e]&&(this.__events[e]=this.__events[e].filter((e=>e!==t)))},removeAllEvents(){this.__events={}},trigger(e){for(var t=arguments.length,i=new Array(t>1?t-1:0),s=1;s<t;s++)i[s-1]=arguments[s];this.__events&&this.__events[e]&&this.__events[e].forEach((e=>{e(...i)}))}};function I(e,t,i){return(t=function(e){var t=function(e,t){if("object"!=typeof e||null===e)return e;var i=e[Symbol.toPrimitive];if(void 0!==i){var s=i.call(e,"string");if("object"!=typeof s)return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"==typeof t?t:String(t)}(t))in e?Object.defineProperty(e,t,{value:i,enumerable:!0,configurable:!0,writable:!0}):e[t]=i,e}let P="",j="",B=!1;class R{static buildGlobalContainer(e){B=!0,P=n({className:e,id:e}),a("body").appendChild(P)}constructor(e,t){var r=this;if(I(this,"viewIndexes",[i.days,i.months,i.years]),I(this,"next",(()=>{let{year:e,month:t}=this.parsedViewDate;switch(this.currentView){case i.days:this.setViewDate(new Date(e,t+1,1));break;case i.months:this.setViewDate(new Date(e+1,t,1));break;case i.years:this.setViewDate(new Date(e+10,0,1))}})),I(this,"prev",(()=>{let{year:e,month:t}=this.parsedViewDate;switch(this.currentView){case i.days:this.setViewDate(new Date(e,t-1,1));break;case i.months:this.setViewDate(new Date(e-1,t,1));break;case i.years:this.setViewDate(new Date(e-10,0,1))}})),I(this,"_finishHide",(()=>{this.hideAnimation=!1,this._destroyComponents(),this.$container.removeChild(this.$datepicker)})),I(this,"setPosition",(function(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if("function"==typeof(e=e||r.opts.position))return void(r.customHide=e({$datepicker:r.$datepicker,$target:r.$el,$pointer:r.$pointer,isViewChange:t,done:r._finishHide}));let i,s,{isMobile:a}=r.opts,n=r.$el.getBoundingClientRect(),h=r.$el.getBoundingClientRect(),o=r.$datepicker.offsetParent,l=r.$el.offsetParent,d=r.$datepicker.getBoundingClientRect(),c=e.split(" "),u=window.scrollY,p=window.scrollX,m=r.opts.offset,v=c[0],g=c[1];if(a)r.$datepicker.style.cssText="left: 50%; top: 50%";else{if(o===l&&o!==document.body&&(h={top:r.$el.offsetTop,left:r.$el.offsetLeft,width:n.width,height:r.$el.offsetHeight},u=0,p=0),o!==l&&o!==document.body){let e=o.getBoundingClientRect();h={top:n.top-e.top,left:n.left-e.left,width:n.width,height:n.height},u=0,p=0}switch(v){case"top":i=h.top-d.height-m;break;case"right":s=h.left+h.width+m;break;case"bottom":i=h.top+h.height+m;break;case"left":s=h.left-d.width-m}switch(g){case"top":i=h.top;break;case"right":s=h.left+h.width-d.width;break;case"bottom":i=h.top+h.height-d.height;break;case"left":s=h.left;break;case"center":/left|right/.test(v)?i=h.top+h.height/2-d.height/2:s=h.left+h.width/2-d.width/2}r.$datepicker.style.cssText=`left: ${s+p}px; top: ${i+u}px`}})),I(this,"_setInputValue",(()=>{let{opts:e,$altField:t,locale:{dateFormat:i}}=this,{altFieldDateFormat:s,altField:a}=e;a&&t&&(t.value=this._getInputValue(s)),this.$el.value=this._getInputValue(i),this.$el.dispatchEvent(new Event("change"))})),I(this,"_getInputValue",(e=>{let{selectedDates:t,opts:i}=this,{multipleDates:s,multipleDatesSeparator:a}=i;if(!t.length)return"";let n="function"==typeof e,r=n?e(s?t:t[0]):t.map((t=>this.formatDate(t,e)));return r=n?r:r.join(a),r})),I(this,"_checkIfDateIsSelected",(function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:i.days,s=!1;return r.selectedDates.some((i=>{let a=p(e,i,t);return s=a&&i,a})),s})),I(this,"_scheduleCallAfterTransition",(e=>{this._cancelScheduledCall(),e&&e(!1),this._onTransitionEnd=()=>{e&&e(!0)},this.$datepicker.addEventListener("transitionend",this._onTransitionEnd,{once:!0})})),I(this,"_cancelScheduledCall",(()=>{this.$datepicker.removeEventListener("transitionend",this._onTransitionEnd)})),I(this,"setViewDate",(e=>{if(!((e=b(e))instanceof Date))return;if(p(e,this.viewDate))return;let t=this.viewDate;this.viewDate=e;let{onChangeViewDate:s}=this.opts;if(s){let{month:e,year:t}=this.parsedViewDate;s({month:e,year:t,decade:this.curDecade})}this.trigger(i.eventChangeViewDate,e,t)})),I(this,"setFocusDate",(function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};(!e||(e=b(e))instanceof Date)&&(r.focusDate=e,r.trigger(i.eventChangeFocusDate,e,t))})),I(this,"setCurrentView",(function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(r.viewIndexes.includes(e)){if(r.currentView=e,r.elIsInput&&r.visible&&r.setPosition(void 0,!0),r.trigger(i.eventChangeCurrentView,e),!r.views[e]){let t=r.views[e]=new T({dp:r,opts:r.opts,type:e});r.shouldUpdateDOM&&r.$content.appendChild(t.$el)}r.opts.onChangeView&&!t.silent&&r.opts.onChangeView(e)}})),I(this,"_updateLastSelectedDate",(e=>{this.lastSelectedDate=e,this.trigger(i.eventChangeLastSelectedDate,e)})),I(this,"destroy",(()=>{if(this.isDestroyed)return;let{showEvent:e,isMobile:t}=this.opts,i=this.$datepicker.parentNode;i&&i.removeChild(this.$datepicker),this.$el.removeEventListener(e,this._onFocus),this.$el.removeEventListener("blur",this._onBlur),window.removeEventListener("resize",this._onResize),t&&this._removeMobileAttributes(),this.keyboardNav&&this.keyboardNav.destroy(),this.views=null,this.nav=null,this.$datepicker=null,this.opts={},this.$customContainer=null,this.viewDate=null,this.focusDate=null,this.selectedDates=[],this.rangeDateFrom=null,this.rangeDateTo=null,this.isDestroyed=!0})),I(this,"update",(function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},s=w({},r.opts),{silent:a}=t;w(r.opts,e);let{timepicker:n,buttons:h,range:o,selectedDates:l,isMobile:d}=r.opts,c=r.visible||r.treatAsInline;r._createMinMaxDates(),r._limitViewDateByMaxMinDates(),r._handleLocale(),l&&(r.selectedDates=[],r.selectDate(l,{silent:a})),e.view&&r.setCurrentView(e.view,{silent:a}),r._setInputValue(),s.range&&!o?(r.rangeDateTo=!1,r.rangeDateFrom=!1):!s.range&&o&&r.selectedDates.length&&(r.rangeDateFrom=r.selectedDates[0],r.rangeDateTo=r.selectedDates[1]),s.timepicker&&!n?(c&&r.timepicker.destroy(),r.timepicker=!1,r.$timepicker.parentNode.removeChild(r.$timepicker)):!s.timepicker&&n&&r._addTimepicker(),!s.buttons&&h?r._addButtons():s.buttons&&!h?(r.buttons.destroy(),r.$buttons.parentNode.removeChild(r.$buttons)):c&&s.buttons&&h&&r.buttons.clearHtml().render(),!s.isMobile&&d?(r.treatAsInline||j||r._createMobileOverlay(),r._addMobileAttributes(),r.visible&&r._showMobileOverlay()):s.isMobile&&!d&&(r._removeMobileAttributes(),r.visible&&(j.classList.remove("-active-"),"function"!=typeof r.opts.position&&r.setPosition())),c&&(r.nav.update(),r.views[r.currentView].render(),r.currentView===i.days&&r.views[r.currentView].renderDayNames())})),I(this,"disableDate",((e,t)=>{(Array.isArray(e)?e:[e]).forEach((e=>{let i=b(e);if(!i)return;let s=t?"delete":"add";this.disabledDates[s](this.formatDate(i,"yyyy-MM-dd"));let a=this.getCell(i,this.currentViewSingular);a&&a.adpCell.render()}),[])})),I(this,"enableDate",(e=>{this.disableDate(e,!0)})),I(this,"isDateDisabled",(e=>{let t=b(e);return this.disabledDates.has(this.formatDate(t,"yyyy-MM-dd"))})),I(this,"isOtherMonth",(e=>{let{month:t}=o(e);return t!==this.parsedViewDate.month})),I(this,"isOtherYear",(e=>{let{year:t}=o(e);return t!==this.parsedViewDate.year})),I(this,"isOtherDecade",(e=>{let{year:t}=o(e),[i,s]=c(this.viewDate);return t<i||t>s})),I(this,"_onChangeSelectedDate",(e=>{let{silent:t}=e;setTimeout((()=>{this._setInputValue(),this.opts.onSelect&&!t&&this._triggerOnSelect()}))})),I(this,"_onChangeFocusedDate",(function(e){let{viewDateTransition:t}=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(!e)return;let i=!1;t&&(i=r.isOtherMonth(e)||r.isOtherYear(e)||r.isOtherDecade(e)),i&&r.setViewDate(e),r.opts.onFocus&&r.opts.onFocus({datepicker:r,date:e})})),I(this,"_onChangeTime",(e=>{let{hours:t,minutes:i}=e,s=new Date,{lastSelectedDate:a,opts:{onSelect:n}}=this,r=a;a||(r=s);let h=this.getCell(r,this.currentViewSingular),o=h&&h.adpCell;o&&o.isDisabled||(r.setHours(t),r.setMinutes(i),a?(this._setInputValue(),n&&this._triggerOnSelect()):this.selectDate(r))})),I(this,"_onFocus",(e=>{this.visible||this.show()})),I(this,"_onBlur",(e=>{this.inFocus||!this.visible||this.opts.isMobile||this.hide()})),I(this,"_onMouseDown",(e=>{this.inFocus=!0})),I(this,"_onMouseUp",(e=>{this.inFocus=!1,this.$el.focus()})),I(this,"_onResize",(()=>{this.visible&&"function"!=typeof this.opts.position&&this.setPosition()})),I(this,"_onClickOverlay",(()=>{this.visible&&this.hide()})),I(this,"getViewDates",(function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:i.days;return T.getDatesFunction(e)(r)})),I(this,"isWeekend",(e=>this.opts.weekends.includes(e))),I(this,"getClampedDate",(e=>{let{minDate:t,maxDate:i}=this,s=e;return i&&m(e,i)?s=i:t&&v(e,t)&&(s=t),s})),this.$el=a(e),!this.$el)return;this.$datepicker=n({className:"air-datepicker"}),this.opts=w({},s,t),this.$customContainer=!!this.opts.container&&a(this.opts.container),this.$altField=a(this.opts.altField||!1);let{view:h,startDate:l}=this.opts;l||(this.opts.startDate=new Date),"INPUT"===this.$el.nodeName&&(this.elIsInput=!0),this.inited=!1,this.visible=!1,this.viewDate=b(this.opts.startDate),this.focusDate=!1,this.initialReadonly=this.$el.getAttribute("readonly"),this.customHide=!1,this.currentView=h,this.selectedDates=[],this.disabledDates=new Set,this.isDestroyed=!1,this.views={},this.keys=[],this.rangeDateFrom="",this.rangeDateTo="",this.timepickerIsActive=!1,this.treatAsInline=this.opts.inline||!this.elIsInput,this.init()}init(){let{opts:e,treatAsInline:t,opts:{inline:i,isMobile:s,selectedDates:n,keyboardNav:r,onlyTimepicker:h}}=this,o=a("body");(!B||B&&P&&!o.contains(P))&&!i&&this.elIsInput&&!this.$customContainer&&R.buildGlobalContainer(R.defaultGlobalContainerId),!s||j||t||this._createMobileOverlay(),this._handleLocale(),this._bindSubEvents(),this._createMinMaxDates(),this._limitViewDateByMaxMinDates(),this.elIsInput&&(i||this._bindEvents(),r&&!h&&(this.keyboardNav=new O({dp:this,opts:e}))),n&&this.selectDate(n,{silent:!0}),this.opts.visible&&!t&&this.show(),s&&!t&&this.$el.setAttribute("readonly",!0),t&&this._createComponents()}_createMobileOverlay(){j=n({className:"air-datepicker-overlay"}),P.appendChild(j)}_createComponents(){let{opts:e,treatAsInline:t,opts:{inline:i,buttons:s,timepicker:a,position:n,classes:r,onlyTimepicker:h,isMobile:o}}=this;this._buildBaseHtml(),this.elIsInput&&(i||this._setPositionClasses(n)),!i&&this.elIsInput||this.$datepicker.classList.add("-inline-"),r&&this.$datepicker.classList.add(...r.split(" ")),h&&this.$datepicker.classList.add("-only-timepicker-"),o&&!t&&this._addMobileAttributes(),this.views[this.currentView]=new T({dp:this,type:this.currentView,opts:e}),this.nav=new V({dp:this,opts:e}),a&&this._addTimepicker(),s&&this._addButtons(),this.$content.appendChild(this.views[this.currentView].$el),this.$nav.appendChild(this.nav.$el)}_destroyComponents(){for(let e in this.views)this.views[e].destroy();this.views={},this.nav.destroy(),this.timepicker&&this.timepicker.destroy()}_addMobileAttributes(){j.addEventListener("click",this._onClickOverlay),this.$datepicker.classList.add("-is-mobile-"),this.$el.setAttribute("readonly",!0)}_removeMobileAttributes(){j.removeEventListener("click",this._onClickOverlay),this.$datepicker.classList.remove("-is-mobile-"),this.initialReadonly||""===this.initialReadonly||this.$el.removeAttribute("readonly")}_createMinMaxDates(){let{minDate:e,maxDate:t}=this.opts;this.minDate=!!e&&b(e),this.maxDate=!!t&&b(t)}_addTimepicker(){this.$timepicker=n({className:"air-datepicker--time"}),this.$datepicker.appendChild(this.$timepicker),this.timepicker=new L({dp:this,opts:this.opts}),this.$timepicker.appendChild(this.timepicker.$el)}_addButtons(){this.$buttons=n({className:"air-datepicker--buttons"}),this.$datepicker.appendChild(this.$buttons),this.buttons=new H({dp:this,opts:this.opts}),this.$buttons.appendChild(this.buttons.$el)}_bindSubEvents(){this.on(i.eventChangeSelectedDate,this._onChangeSelectedDate),this.on(i.eventChangeFocusDate,this._onChangeFocusedDate),this.on(i.eventChangeTime,this._onChangeTime)}_buildBaseHtml(){let{inline:e}=this.opts;var t,i;this.elIsInput?e?(t=this.$datepicker,(i=this.$el).parentNode.insertBefore(t,i.nextSibling)):this.$container.appendChild(this.$datepicker):this.$el.appendChild(this.$datepicker),this.$datepicker.innerHTML='<i class="air-datepicker--pointer"></i><div class="air-datepicker--navigation"></div><div class="air-datepicker--content"></div>',this.$content=a(".air-datepicker--content",this.$datepicker),this.$pointer=a(".air-datepicker--pointer",this.$datepicker),this.$nav=a(".air-datepicker--navigation",this.$datepicker)}_handleLocale(){let{locale:e,dateFormat:t,firstDay:i,timepicker:s,onlyTimepicker:a,timeFormat:n,dateTimeSeparator:r}=this.opts;var h;this.locale=(h=e,JSON.parse(JSON.stringify(h))),t&&(this.locale.dateFormat=t),void 0!==n&&""!==n&&(this.locale.timeFormat=n);let{timeFormat:o}=this.locale;if(""!==i&&(this.locale.firstDay=i),s&&"function"!=typeof t){let e=o?r:"";this.locale.dateFormat=[this.locale.dateFormat,o||""].join(e)}a&&"function"!=typeof t&&(this.locale.dateFormat=this.locale.timeFormat)}_setPositionClasses(e){if("function"==typeof e)return void this.$datepicker.classList.add("-custom-position-");let t=(e=e.split(" "))[0],i=`air-datepicker -${t}-${e[1]}- -from-${t}-`;this.$datepicker.classList.add(...i.split(" "))}_bindEvents(){this.$el.addEventListener(this.opts.showEvent,this._onFocus),this.$el.addEventListener("blur",this._onBlur),this.$datepicker.addEventListener("mousedown",this._onMouseDown),this.$datepicker.addEventListener("mouseup",this._onMouseUp),window.addEventListener("resize",this._onResize)}_limitViewDateByMaxMinDates(){let{viewDate:e,minDate:t,maxDate:i}=this;i&&m(e,i)&&this.setViewDate(i),t&&v(e,t)&&this.setViewDate(t)}formatDate(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:this.viewDate,t=arguments.length>1?arguments[1]:void 0;if(e=b(e),!(e instanceof Date))return;let i=t,s=this.locale,a=o(e),n=a.dayPeriod,r=c(e),h=R.replacer,l={T:e.getTime(),m:a.minutes,mm:a.fullMinutes,h:a.hours12,hh:a.fullHours12,H:a.hours,HH:a.fullHours,aa:n,AA:n.toUpperCase(),E:s.daysShort[a.day],EEEE:s.days[a.day],d:a.date,dd:a.fullDate,M:a.month+1,MM:a.fullMonth,MMM:s.monthsShort[a.month],MMMM:s.months[a.month],yy:a.year.toString().slice(-2),yyyy:a.year,yyyy1:r[0],yyyy2:r[1]};for(let[e,t]of Object.entries(l))i=h(i,$(e),t);return i}down(e){this._handleUpDownActions(e,"down")}up(e){this._handleUpDownActions(e,"up")}selectDate(e){let t,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},{currentView:a,parsedViewDate:n,selectedDates:r}=this,{updateTime:h,silent:o}=s,{moveToOtherMonthsOnSelect:l,moveToOtherYearsOnSelect:d,multipleDates:c,range:u,autoClose:p,onBeforeSelect:v}=this.opts,g=r.length;if(Array.isArray(e))return e.forEach((e=>{this.selectDate(e,s)})),new Promise((e=>{setTimeout(e)}));if((e=b(e))instanceof Date){if(v&&!o&&!v({date:e,datepicker:this}))return Promise.resolve();if(a===i.days&&e.getMonth()!==n.month&&l&&(t=new Date(e.getFullYear(),e.getMonth(),1)),a===i.years&&e.getFullYear()!==n.year&&d&&(t=new Date(e.getFullYear(),0,1)),t&&this.setViewDate(t),c&&!u){if(g===c)return;this._checkIfDateIsSelected(e)||r.push(e)}else if(u)switch(g){case 1:r.push(e),this.rangeDateTo||(this.rangeDateTo=e),m(this.rangeDateFrom,this.rangeDateTo)&&(this.rangeDateTo=this.rangeDateFrom,this.rangeDateFrom=e),this.selectedDates=[this.rangeDateFrom,this.rangeDateTo];break;case 2:this.selectedDates=[e],this.rangeDateFrom=e,this.rangeDateTo="";break;default:this.selectedDates=[e],this.rangeDateFrom=e}else this.selectedDates=[e];return this.trigger(i.eventChangeSelectedDate,{action:i.actionSelectDate,silent:null==s?void 0:s.silent,date:e,updateTime:h}),this._updateLastSelectedDate(e),p&&!this.timepickerIsActive&&this.visible&&(c||u?u&&1===g&&this.hide():this.hide()),new Promise((e=>{setTimeout(e)}))}}unselectDate(e){let t=this.selectedDates,s=this;if((e=b(e))instanceof Date)return t.some(((a,n)=>{if(p(a,e))return t.splice(n,1),s.selectedDates.length?(s.rangeDateTo="",s.rangeDateFrom=t[0],s._updateLastSelectedDate(s.selectedDates[s.selectedDates.length-1])):(s.rangeDateFrom="",s.rangeDateTo="",s._updateLastSelectedDate(!1)),this.trigger(i.eventChangeSelectedDate,{action:i.actionUnselectDate,date:e}),!0}))}replaceDate(e,t){let s=this.selectedDates.find((t=>p(t,e,this.currentView))),a=this.selectedDates.indexOf(s);a<0||p(this.selectedDates[a],t,this.currentView)||(this.selectedDates[a]=t,this.trigger(i.eventChangeSelectedDate,{action:i.actionSelectDate,date:t,updateTime:!0}),this._updateLastSelectedDate(t))}clear(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return this.selectedDates=[],this.rangeDateFrom=!1,this.rangeDateTo=!1,this.lastSelectedDate=!1,this.trigger(i.eventChangeSelectedDate,{action:i.actionUnselectDate,silent:e.silent}),new Promise((e=>{setTimeout(e)}))}show(){let{onShow:e,isMobile:t}=this.opts;this._cancelScheduledCall(),this.visible||this.hideAnimation||this._createComponents(),this.setPosition(this.opts.position),this.$datepicker.classList.add("-active-"),this.visible=!0,e&&this._scheduleCallAfterTransition(e),t&&this._showMobileOverlay()}hide(){let{onHide:e,isMobile:t}=this.opts,i=this._hasTransition();this.visible=!1,this.hideAnimation=!0,this.$datepicker.classList.remove("-active-"),this.customHide&&this.customHide(),this.elIsInput&&this.$el.blur(),this._scheduleCallAfterTransition((t=>{!this.customHide&&(t&&i||!t&&!i)&&this._finishHide(),e&&e(t)})),t&&j.classList.remove("-active-")}_triggerOnSelect(){let e=[],t=[],{selectedDates:i,locale:s,opts:{onSelect:a,multipleDates:n,range:r}}=this,h=n||r,o="function"==typeof s.dateFormat;i.length&&(e=i.map(g),t=o?n?s.dateFormat(e):e.map((e=>s.dateFormat(e))):e.map((e=>this.formatDate(e,s.dateFormat)))),a({date:h?e:e[0],formattedDate:h?t:t[0],datepicker:this})}_handleAlreadySelectedDates(e,t){let{selectedDates:i,rangeDateFrom:s,rangeDateTo:a}=this,{range:n,toggleSelected:r}=this.opts,h=i.length,o="function"==typeof r?r({datepicker:this,date:t}):r,l=Boolean(n&&1===h&&e),d=l?g(t):t;n&&!o&&(2!==h&&this.selectDate(d),2===h&&p(s,a))||(o?this.unselectDate(d):this._updateLastSelectedDate(l?d:e))}_handleUpDownActions(e,t){if(!((e=b(e||this.focusDate||this.viewDate))instanceof Date))return;let i="up"===t?this.viewIndex+1:this.viewIndex-1;i>2&&(i=2),i<0&&(i=0),this.setViewDate(new Date(e.getFullYear(),e.getMonth(),1)),this.setCurrentView(this.viewIndexes[i])}getCell(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:i.day;if(!((e=b(e))instanceof Date))return;let{year:s,month:a,date:n}=o(e),r=`[data-year="${s}"]`,h=`[data-month="${a}"]`,l={[i.day]:`${r}${h}[data-date="${n}"]`,[i.month]:`${r}${h}`,[i.year]:`${r}`};return this.views[this.currentView]?this.views[this.currentView].$el.querySelector(l[t]):void 0}_showMobileOverlay(){j.classList.add("-active-")}_hasTransition(){return window.getComputedStyle(this.$datepicker).getPropertyValue("transition-duration").split(", ").reduce(((e,t)=>parseFloat(t)+e),0)>0}get shouldUpdateDOM(){return this.visible||this.treatAsInline}get parsedViewDate(){return o(this.viewDate)}get currentViewSingular(){return this.currentView.slice(0,-1)}get curDecade(){return c(this.viewDate)}get viewIndex(){return this.viewIndexes.indexOf(this.currentView)}get isFinalView(){return this.currentView===i.years}get hasSelectedDates(){return this.selectedDates.length>0}get isMinViewReached(){return this.currentView===this.opts.minView||this.currentView===i.days}get $container(){return this.$customContainer||P}static replacer(e,t,i){return e.replace(t,(function(e,t,s,a){return t+i+a}))}}var K;return I(R,"defaults",s),I(R,"version","3.6.0"),I(R,"defaultGlobalContainerId","air-datepicker-global-container"),K=R.prototype,Object.assign(K,N),t.default}()}));
/* ===== vendor: air-datepicker locale zh.js (unmodified CommonJS, given a local exports scope) ===== */
(function () { var exports = {};
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = {
  days: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
  daysShort: ['日', '一', '二', '三', '四', '五', '六'],
  daysMin: ['日', '一', '二', '三', '四', '五', '六'],
  months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  monthsShort: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  today: '今天',
  clear: '清除',
  dateFormat: 'yyyy-MM-dd',
  timeFormat: 'HH:mm',
  firstDay: 1
};
exports.default = _default;
window.__airLocaleZh = exports.default; })();
/* Icons: Lucide v0.577.0 (ISC License, Copyright (c) Lucide Contributors 2022; portions Copyright (c) 2013-2022 Cole Bemis, Feather, MIT). https://github.com/lucide-icons/lucide · inlined from node_modules/lucide-react/dist/esm/icons */
const ICONS={
"house":["path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\"","path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\""],
"list-checks":["path d=\"M13 5h8\"","path d=\"M13 12h8\"","path d=\"M13 19h8\"","path d=\"m3 17 2 2 4-4\"","path d=\"m3 7 2 2 4-4\""],
"book-open":["path d=\"M12 7v14\"","path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\""],
"library":["path d=\"m16 6 4 14\"","path d=\"M12 6v14\"","path d=\"M8 8v12\"","path d=\"M4 4v16\""],
"workflow":["rect width=\"8\" height=\"8\" x=\"3\" y=\"3\" rx=\"2\"","path d=\"M7 11v4a2 2 0 0 0 2 2h4\"","rect width=\"8\" height=\"8\" x=\"13\" y=\"13\" rx=\"2\""],
"bot":["path d=\"M12 8V4H8\"","rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\"","path d=\"M2 14h2\"","path d=\"M20 14h2\"","path d=\"M15 13v2\"","path d=\"M9 13v2\""],
"lock-keyhole":["circle cx=\"12\" cy=\"16\" r=\"1\"","rect x=\"3\" y=\"10\" width=\"18\" height=\"12\" rx=\"2\"","path d=\"M7 10V7a5 5 0 0 1 10 0v3\""],
"history":["path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"","path d=\"M3 3v5h5\"","path d=\"M12 7v5l4 2\""],
"heart-pulse":["path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\"","path d=\"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27\""],
"bell":["path d=\"M10.268 21a2 2 0 0 0 3.464 0\"","path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\""],
"settings":["path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"","circle cx=\"12\" cy=\"12\" r=\"3\""],
"search":["path d=\"m21 21-4.34-4.34\"","circle cx=\"11\" cy=\"11\" r=\"8\""],
"plus":["path d=\"M5 12h14\"","path d=\"M12 5v14\""],
"x":["path d=\"M18 6 6 18\"","path d=\"m6 6 12 12\""],
"chevron-right":["path d=\"m9 18 6-6-6-6\""],
"chevron-down":["path d=\"m6 9 6 6 6-6\""],
"chevron-left":["path d=\"m15 18-6-6 6-6\""],
"chevron-up":["path d=\"m18 15-6-6-6 6\""],
"ellipsis":["circle cx=\"12\" cy=\"12\" r=\"1\"","circle cx=\"19\" cy=\"12\" r=\"1\"","circle cx=\"5\" cy=\"12\" r=\"1\""],
"calendar":["path d=\"M8 2v4\"","path d=\"M16 2v4\"","rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"","path d=\"M3 10h18\""],
"calendar-days":["path d=\"M8 2v4\"","path d=\"M16 2v4\"","rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"","path d=\"M3 10h18\"","path d=\"M8 14h.01\"","path d=\"M12 14h.01\"","path d=\"M16 14h.01\"","path d=\"M8 18h.01\"","path d=\"M12 18h.01\"","path d=\"M16 18h.01\""],
"clock":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"M12 6v6l4 2\""],
"check":["path d=\"M20 6 9 17l-5-5\""],
"circle-check":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"m9 12 2 2 4-4\""],
"circle-alert":["circle cx=\"12\" cy=\"12\" r=\"10\"","line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"","line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\""],
"triangle-alert":["path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"","path d=\"M12 9v4\"","path d=\"M12 17h.01\""],
"info":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"M12 16v-4\"","path d=\"M12 8h.01\""],
"panel-left":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"","path d=\"M9 3v18\""],
"panel-right":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"","path d=\"M15 3v18\""],
"layout-grid":["rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"","rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"","rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"","rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\""],
"square-kanban":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"","path d=\"M8 7v7\"","path d=\"M12 7v4\"","path d=\"M16 7v9\""],
"list":["path d=\"M3 5h.01\"","path d=\"M3 12h.01\"","path d=\"M3 19h.01\"","path d=\"M8 5h13\"","path d=\"M8 12h13\"","path d=\"M8 19h13\""],
"list-filter":["path d=\"M2 5h20\"","path d=\"M6 12h12\"","path d=\"M9 19h6\""],
"arrow-up-down":["path d=\"m21 16-4 4-4-4\"","path d=\"M17 20V4\"","path d=\"m3 8 4-4 4 4\"","path d=\"M7 4v16\""],
"play":["path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\""],
"pause":["rect x=\"14\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\"","rect x=\"5\" y=\"3\" width=\"5\" height=\"18\" rx=\"1\""],
"square":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\""],
"rotate-ccw":["path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"","path d=\"M3 3v5h5\""],
"refresh-cw":["path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"","path d=\"M21 3v5h-5\"","path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"","path d=\"M8 16H3v5\""],
"pencil":["path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"","path d=\"m15 5 4 4\""],
"trash-2":["path d=\"M10 11v6\"","path d=\"M14 11v6\"","path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"","path d=\"M3 6h18\"","path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\""],
"copy":["rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"","path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\""],
"eye":["path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"","circle cx=\"12\" cy=\"12\" r=\"3\""],
"eye-off":["path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"","path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"","path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"","path d=\"m2 2 20 20\""],
"lock":["rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"","path d=\"M7 11V7a5 5 0 0 1 10 0v4\""],
"lock-open":["rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"","path d=\"M7 11V7a5 5 0 0 1 9.9-1\""],
"key-round":["path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"","circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\""],
"credit-card":["rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"","line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\""],
"sticky-note":["path d=\"M21 9a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 15 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z\"","path d=\"M15 3v5a1 1 0 0 0 1 1h5\""],
"id-card":["path d=\"M16 10h2\"","path d=\"M16 14h2\"","path d=\"M6.17 15a3 3 0 0 1 5.66 0\"","circle cx=\"9\" cy=\"11\" r=\"2\"","rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\""],
"user":["path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"","circle cx=\"12\" cy=\"7\" r=\"4\""],
"users":["path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"","path d=\"M16 3.128a4 4 0 0 1 0 7.744\"","path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"","circle cx=\"9\" cy=\"7\" r=\"4\""],
"package":["path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"","path d=\"M12 22V12\"","polyline points=\"3.29 7 12 12 20.71 7\"","path d=\"m7.5 4.27 9 5.15\""],
"book":["path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20\""],
"folder":["path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\""],
"folder-open":["path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\""],
"file-text":["path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"","path d=\"M14 2v5a1 1 0 0 0 1 1h5\"","path d=\"M10 9H8\"","path d=\"M16 13H8\"","path d=\"M16 17H8\""],
"files":["path d=\"M15 2h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8\"","path d=\"M16.706 2.706A2.4 2.4 0 0 0 15 2v5a1 1 0 0 0 1 1h5a2.4 2.4 0 0 0-.706-1.706z\"","path d=\"M5 7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h8a2 2 0 0 0 1.732-1\""],
"tag":["path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"","circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\""],
"flag":["path d=\"M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528\""],
"link":["path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"","path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\""],
"paperclip":["path d=\"m16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 1 0-5.657-5.657l-8.379 8.551a6 6 0 1 0 8.485 8.485l8.379-8.551\""],
"sparkles":["path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\"","path d=\"M20 2v4\"","path d=\"M22 4h-4\"","circle cx=\"4\" cy=\"20\" r=\"2\""],
"square-terminal":["path d=\"m7 11 2-2-2-2\"","path d=\"M11 13h4\"","rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\""],
"columns-2":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"","path d=\"M12 3v18\""],
"message-square":["path d=\"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z\""],
"message-square-text":["path d=\"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z\"","path d=\"M7 11h10\"","path d=\"M7 15h6\"","path d=\"M7 7h8\""],
"inbox":["polyline points=\"22 12 16 12 14 15 10 15 8 12 2 12\"","path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\""],
"chart-column":["path d=\"M3 3v16a2 2 0 0 0 2 2h16\"","path d=\"M18 17V9\"","path d=\"M13 17V5\"","path d=\"M8 17v-3\""],
"activity":["path d=\"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2\""],
"cpu":["path d=\"M12 20v2\"","path d=\"M12 2v2\"","path d=\"M17 20v2\"","path d=\"M17 2v2\"","path d=\"M2 12h2\"","path d=\"M2 17h2\"","path d=\"M2 7h2\"","path d=\"M20 12h2\"","path d=\"M20 17h2\"","path d=\"M20 7h2\"","path d=\"M7 20v2\"","path d=\"M7 2v2\"","rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"","rect x=\"8\" y=\"8\" width=\"8\" height=\"8\" rx=\"1\""],
"timer":["line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\"","line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\"","circle cx=\"12\" cy=\"14\" r=\"8\""],
"sun":["circle cx=\"12\" cy=\"12\" r=\"4\"","path d=\"M12 2v2\"","path d=\"M12 20v2\"","path d=\"m4.93 4.93 1.41 1.41\"","path d=\"m17.66 17.66 1.41 1.41\"","path d=\"M2 12h2\"","path d=\"M20 12h2\"","path d=\"m6.34 17.66-1.41 1.41\"","path d=\"m19.07 4.93-1.41 1.41\""],
"moon":["path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\""],
"monitor":["rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"","line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"","line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\""],
"palette":["path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\"","circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"","circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"","circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"","circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\""],
"type":["path d=\"M12 4v16\"","path d=\"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2\"","path d=\"M9 20h6\""],
"keyboard":["path d=\"M10 8h.01\"","path d=\"M12 12h.01\"","path d=\"M14 8h.01\"","path d=\"M16 12h.01\"","path d=\"M18 8h.01\"","path d=\"M6 8h.01\"","path d=\"M7 16h10\"","path d=\"M8 12h.01\"","rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\""],
"command":["path d=\"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3\""],
"download":["path d=\"M12 15V3\"","path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"","path d=\"m7 10 5 5 5-5\""],
"external-link":["path d=\"M15 3h6v6\"","path d=\"M10 14 21 3\"","path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\""],
"grip-vertical":["circle cx=\"9\" cy=\"12\" r=\"1\"","circle cx=\"9\" cy=\"5\" r=\"1\"","circle cx=\"9\" cy=\"19\" r=\"1\"","circle cx=\"15\" cy=\"12\" r=\"1\"","circle cx=\"15\" cy=\"5\" r=\"1\"","circle cx=\"15\" cy=\"19\" r=\"1\""],
"circle":["circle cx=\"12\" cy=\"12\" r=\"10\""],
"circle-dot":["circle cx=\"12\" cy=\"12\" r=\"10\"","circle cx=\"12\" cy=\"12\" r=\"1\""],
"hash":["line x1=\"4\" x2=\"20\" y1=\"9\" y2=\"9\"","line x1=\"4\" x2=\"20\" y1=\"15\" y2=\"15\"","line x1=\"10\" x2=\"8\" y1=\"3\" y2=\"21\"","line x1=\"16\" x2=\"14\" y1=\"3\" y2=\"21\""],
"star":["path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\""],
"map-pin":["path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\"","circle cx=\"12\" cy=\"10\" r=\"3\""],
"wallet":["path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"","path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\""],
"bookmark":["path d=\"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z\""],
"highlighter":["path d=\"m9 11-6 6v3h9l3-3\"","path d=\"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4\""],
"scan-search":["path d=\"M3 7V5a2 2 0 0 1 2-2h2\"","path d=\"M17 3h2a2 2 0 0 1 2 2v2\"","path d=\"M21 17v2a2 2 0 0 1-2 2h-2\"","path d=\"M7 21H5a2 2 0 0 1-2-2v-2\"","circle cx=\"12\" cy=\"12\" r=\"3\"","path d=\"m16 16-1.9-1.9\""],
"wrench":["path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z\""],
"shield-check":["path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"","path d=\"m9 12 2 2 4-4\""],
"undo-2":["path d=\"M9 14 4 9l5-5\"","path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\""],
"git-compare":["circle cx=\"18\" cy=\"18\" r=\"3\"","circle cx=\"6\" cy=\"6\" r=\"3\"","path d=\"M13 6h3a2 2 0 0 1 2 2v7\"","path d=\"M11 18H8a2 2 0 0 1-2-2V9\""],
"git-commit-horizontal":["circle cx=\"12\" cy=\"12\" r=\"3\"","line x1=\"3\" x2=\"9\" y1=\"12\" y2=\"12\"","line x1=\"15\" x2=\"21\" y1=\"12\" y2=\"12\""],
"laptop":["path d=\"M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z\"","path d=\"M20.054 15.987H3.946\""],
"server":["rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\" ry=\"2\"","rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\" ry=\"2\"","line x1=\"6\" x2=\"6.01\" y1=\"6\" y2=\"6\"","line x1=\"6\" x2=\"6.01\" y1=\"18\" y2=\"18\""],
"mail":["path d=\"m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7\"","rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\""],
"smartphone":["rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"","path d=\"M12 18h.01\""],
"cloud-sun":["path d=\"M12 2v2\"","path d=\"m4.93 4.93 1.41 1.41\"","path d=\"M20 12h2\"","path d=\"m19.07 4.93-1.41 1.41\"","path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\"","path d=\"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z\""],
"pen-line":["path d=\"M13 21h8\"","path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\""],
"layers":["path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\"","path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\"","path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\""],
"sliders-horizontal":["path d=\"M10 5H3\"","path d=\"M12 19H3\"","path d=\"M14 3v4\"","path d=\"M16 17v4\"","path d=\"M21 12h-9\"","path d=\"M21 19h-5\"","path d=\"M21 5h-7\"","path d=\"M8 10v4\"","path d=\"M8 12H3\""],
"arrow-right":["path d=\"M5 12h14\"","path d=\"m12 5 7 7-7 7\""],
"arrow-left":["path d=\"m12 19-7-7 7-7\"","path d=\"M19 12H5\""],
"minus":["path d=\"M5 12h14\""],
"maximize-2":["path d=\"M15 3h6v6\"","path d=\"m21 3-7 7\"","path d=\"m3 21 7-7\"","path d=\"M9 21H3v-6\""],
"notebook-pen":["path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"","path d=\"M2 6h4\"","path d=\"M2 10h4\"","path d=\"M2 14h4\"","path d=\"M2 18h4\"","path d=\"M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\""],
"list-todo":["path d=\"M13 5h8\"","path d=\"M13 12h8\"","path d=\"M13 19h8\"","path d=\"m3 17 2 2 4-4\"","rect x=\"3\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\""],
"shapes":["path d=\"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z\"","rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"","circle cx=\"17.5\" cy=\"17.5\" r=\"3.5\""],
"gauge":["path d=\"m12 14 4-4\"","path d=\"M3.34 19a10 10 0 1 1 17.32 0\""],
"circle-x":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"m15 9-6 6\"","path d=\"m9 9 6 6\""],
"circle-pause":["circle cx=\"12\" cy=\"12\" r=\"10\"","line x1=\"10\" x2=\"10\" y1=\"15\" y2=\"9\"","line x1=\"14\" x2=\"14\" y1=\"15\" y2=\"9\""],
"zap":["path d=\"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z\""],
"leaf":["path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"","path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\""],
"feather":["path d=\"M12.67 19a2 2 0 0 0 1.416-.588l6.154-6.172a6 6 0 0 0-8.49-8.49L5.586 9.914A2 2 0 0 0 5 11.328V18a1 1 0 0 0 1 1z\"","path d=\"M16 8 2 22\"","path d=\"M17.5 15H9\""],
"smile":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"M8 14s1.5 2 4 2 4-2 4-2\"","line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\"","line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\""],
"image":["rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"","circle cx=\"9\" cy=\"9\" r=\"2\"","path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\""],
"square-pen":["path d=\"M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"","path d=\"M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z\""],
"arrow-up-right":["path d=\"M7 7h10v10\"","path d=\"M7 17 17 7\""],
"shield":["path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\""],
"ban":["circle cx=\"12\" cy=\"12\" r=\"10\"","path d=\"M4.929 4.929 19.07 19.071\""],
"loader":["path d=\"M12 2v4\"","path d=\"m16.2 7.8 2.9-2.9\"","path d=\"M18 12h4\"","path d=\"m16.2 16.2 2.9 2.9\"","path d=\"M12 18v4\"","path d=\"m4.9 19.1 2.9-2.9\"","path d=\"M2 12h4\"","path d=\"m4.9 4.9 2.9 2.9\""],
"text-search":["path d=\"M21 5H3\"","path d=\"M10 12H3\"","path d=\"M10 19H3\"","circle cx=\"17\" cy=\"15\" r=\"3\"","path d=\"m21 19-1.9-1.9\""],
"split":["path d=\"M16 3h5v5\"","path d=\"M8 3H3v5\"","path d=\"M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3\"","path d=\"m15 9 6-6\""],
"send":["path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\"","path d=\"m21.854 2.147-10.94 10.939\""],
"at-sign":["circle cx=\"12\" cy=\"12\" r=\"4\"","path d=\"M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8\""],
"quote":["path d=\"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\"","path d=\"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z\""]
};

/* ==========================================================================
   HUHU UI-002 prototype core. In-memory demo state only; nothing touches a
   real vault, process, network or system clipboard.
   ========================================================================== */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RAW = Symbol('raw');
const raw = s => ({ [RAW]: String(s) });
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function val(v) { if (v == null) return ''; if (v === false) return 'false'; if (Array.isArray(v)) return v.map(val).join(''); if (v && v[RAW] != null) return v[RAW]; return esc(v); }
function h(strings, ...vals) { let out = strings[0]; vals.forEach((v, i) => { out += val(v) + strings[i + 1]; }); return raw(out); }
const html = x => val(x);
function icon(name, cls = '') {
  const nodes = ICONS[name] || ICONS['circle'];
  return raw(`<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${nodes.map(n => `<${n}/>`).join('')}</svg>`);
}
const CHECK_SVG = raw('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>');
let uid = 0; const nextId = p => `${p}-${++uid}`;

/* ---------- Dates (local calendar days; never via UTC) ---------- */
const TODAY = new Date(2026, 10, 5);
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim()); if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3]; const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a, b) => Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()) - new Date(b.getFullYear(), b.getMonth(), b.getDate())) / 864e5);
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function relDay(s) {
  const d = parseYmd(s); if (!d) return '';
  const n = dayDiff(d, TODAY);
  if (n === 0) return '今天'; if (n === 1) return '明天'; if (n === -1) return '昨天';
  if (n > 1 && n < 7) return WEEK[d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
const fmtLong = s => { const d = parseYmd(s); return d ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}` : ''; };

/* ---------- App state ---------- */
const PREF_KEY = 'huhu-ui002-prefs';
const S = {
  scene: 'workbench', page: 'home', state: 'default',
  theme: 'paper', mode: 'light', accent: 'teal', source: 'huhu', density: 'compact', uiSize: '14', motion: 'system', fontUi: 'geist',
  panelW: 272, panelSheet: false, detailOpen: false,
  width: 'wide', toasts: [],
};
try { Object.assign(S, JSON.parse(sessionStorage.getItem(PREF_KEY) || '{}')); } catch { /* prototype preference only */ }
function savePrefs() { try { const { theme, mode, accent, source, density, uiSize, motion, fontUi, panelW } = S; sessionStorage.setItem(PREF_KEY, JSON.stringify({ theme, mode, accent, source, density, uiSize, motion, fontUi, panelW })); } catch { /* ignore */ } }
function applyTheme() {
  const root = document.documentElement;
  const dark = S.mode === 'dark' || (S.mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  S.theme = dark ? 'ink' : 'paper';
  root.dataset.theme = S.theme; root.dataset.accent = S.accent; root.dataset.density = S.density; root.dataset.uiSize = S.uiSize;
  root.dataset.source = S.source; root.dataset.motion = S.motion === 'reduce' ? 'reduce' : 'system';
  root.style.setProperty('--hu-panel-w', `${S.panelW}px`);
  root.style.setProperty('--hu-font-ui', S.fontUi === 'system' ? '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif' : '');
  if (S.fontUi !== 'system') root.style.removeProperty('--hu-font-ui');
}

/* ---------- Pages registry ---------- */
const PAGES = {};
const RAIL = [
  ['home', '首页', 'house'], ['tasks', '任务', 'list-checks'], ['diary', '日记', 'notebook-pen'], ['archives', '档案', 'library'],
  ['automations', '自动化', 'workflow'], ['agent', '智能体', 'bot'], ['safe', '保险箱', 'lock-keyhole'], ['versioning', '版本', 'history'], ['health', '体检', 'heart-pulse'],
];
const RAIL_END = [['notifications', '通知', 'bell'], ['settings', '设置', 'settings']];
function page() { return PAGES[S.page]; }

/* ---------- Region rendering ---------- */
function setHTML(el, content) { if (typeof el === 'string') el = $(el); if (el) el.innerHTML = html(content); return el; }
function measure() {
  const w = $('#app').getBoundingClientRect().width; S.width = w >= 960 ? 'wide' : w >= 600 ? 'medium' : 'narrow';
  const app = $('#app'); app.dataset.width = S.width;
  const mainW = w - (S.width === 'wide' ? 52 + (page()?.panel?.() ? S.panelW : 0) : S.width === 'medium' ? 52 : 0);
  app.dataset.detailMode = mainW - 360 >= 640 ? 'inline' : 'sheet';
}
function render() {
  applyTheme(); measure();
  const p = page();
  $('#app').dataset.scene = S.scene;
  renderHostTabs(); renderStatus();
  const wb = $('#workbench');
  if (S.scene === 'notes') { setHTML(wb, PAGES.notes.scene()); PAGES.notes.mount?.(); syncProto(); return; }
  if (!$('#rail', wb)) setHTML(wb, h`<nav class="rail" id="rail" aria-label="HUHU 模块"></nav><aside class="panel" id="panel" aria-label="二级导航"></aside><main class="page" id="main" tabindex="-1"></main><aside class="detail" id="detail" aria-label="详情" hidden></aside><div class="scrim" id="scrim" hidden data-action="scrim"></div>`);
  renderRail(); renderPanel(); renderMain(); renderDetail();
  syncProto();
}
function renderRail() {
  const btn = ([id, label, ic]) => h`<button class="rail-btn" data-action="go" data-page="${id}" aria-label="${label}" data-tip="${label}" ${S.page === id ? raw('aria-current="page"') : ''}>${icon(ic)}${id === 'notifications' && DATA.unread() ? h`<span class="rail-badge">${DATA.unread()}</span>` : ''}${id === 'agent' ? raw('<span class="rail-dot" title="1 个会话等待回答"></span>') : ''}</button>`;
  setHTML('#rail', h`${RAIL.map(btn)}<div class="rail-end">${RAIL_END.map(btn)}</div>`);
}
function railInPanel() { return h`<div class="rail-in-panel" role="navigation" aria-label="模块">${[...RAIL, ...RAIL_END].map(([id, label, ic]) => h`<button class="rail-btn" data-action="go" data-page="${id}" aria-label="${label}" ${S.page === id ? raw('aria-current="page"') : ''}>${icon(ic)}</button>`)}</div>`; }
function renderPanel() {
  const p = page(), el = $('#panel');
  const content = p.panel ? p.panel() : null;
  const asSheet = S.width !== 'wide';
  const show = (content || S.width === 'narrow') && (!asSheet || S.panelSheet);
  if (show && asSheet) {el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');} else {el.removeAttribute('role');el.removeAttribute('aria-modal');}
  el.hidden = !show;
  $('#scrim').hidden = !(asSheet && S.panelSheet) && !(S.detailOpen && $('#app').dataset.detailMode === 'sheet');
  if (!show) { el.innerHTML = ''; return; }
  setHTML(el, h`${railInPanel()}${content}${asSheet ? '' : raw('<div class="panel-resize" role="separator" aria-orientation="vertical" aria-label="调整二级栏宽度" tabindex="0" aria-valuemin="220" aria-valuemax="480" aria-valuenow="' + S.panelW + '"></div>')}`);
  p.mountPanel?.();
}
function panelToggle() { return page().panel ? h`<button class="btn btn-ghost btn-icon panel-toggle" data-action="toggle-panel" aria-label="打开导航" aria-expanded="${S.panelSheet}">${icon('panel-left')}</button>` : (S.width === 'narrow' ? h`<button class="btn btn-ghost btn-icon panel-toggle" data-action="toggle-panel" aria-label="打开导航" style="display:inline-flex">${icon('panel-left')}</button>` : ''); }
function renderMain() {
  const p = page(); const main = $('#main');
  main.dataset.page = S.page; main.dataset.state = S.state;
  setHTML(main, p.main());
  p.mount?.();
}
function renderDetail() {
  const p = page(), el = $('#detail');
  const content = p.detail ? p.detail() : null;
  S.detailOpen = !!content; el.hidden = !content;
  const sheet = $('#app').dataset.detailMode === 'sheet';
  $('#scrim').hidden = !(S.width !== 'wide' && S.panelSheet) && !(content && sheet);
  if (sheet && content) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); } else { el.removeAttribute('role'); el.removeAttribute('aria-modal'); }
  setHTML(el, content || '');
  p.mountDetail?.();
}
const pageHead = (title, { sub = '', actions = '', crumb = '' } = {}) => h`<header class="page-head">${panelToggle()}${crumb ? h`<div class="crumb">${crumb}</div>` : ''}<h1 id="page-title">${title}</h1>${sub ? h`<span class="sub">${sub}</span>` : ''}<div class="actions">${actions}</div></header>`;

/* ---------- Host chrome ---------- */
function renderHostTabs() {
  setHTML('#host-tabs', h`<div class="host-brand"><span class="logo">${icon('leaf')}</span><span>个人知识库</span></div>
  <button class="host-tab" role="tab" data-action="scene" data-scene="workbench" aria-selected="${S.scene === 'workbench'}">${icon('layout-grid')}<span>HUHU 工作台</span></button>
  <button class="host-tab" role="tab" data-action="scene" data-scene="notes" aria-selected="${S.scene === 'notes'}">${icon('file-text')}<span>产品周报.md</span></button>
  <div class="host-tools">
    <button class="btn btn-ghost btn-sm" data-action="cmd" aria-label="命令面板">${icon('search', 'ico-sm')}<span>命令</span></button>
    <button class="btn btn-ghost btn-icon btn-sm" data-action="toggle-mode" aria-label="${S.theme === 'ink' ? '切换为浅色' : '切换为深色'}" data-tip="${S.theme === 'ink' ? '浅色' : '深色'}" data-tip-pos="bottom">${icon(S.theme === 'ink' ? 'sun' : 'moon', 'ico-sm')}</button>
    <button class="btn btn-ghost btn-sm" id="proto-btn" data-action="proto" aria-label="原型状态" aria-haspopup="dialog"><span class="proto-flag">原型</span></button>
  </div>`);
}
function renderStatus() {
  setHTML('#host-status', h`<span class="item left hide-narrow">${icon('leaf')}个人知识库</span>
  <button class="item hide-narrow" data-action="go" data-page="agent">${icon('bot')}Claude 34% · Codex 18%</button>
  <button class="item" data-action="go" data-page="automations">${icon('workflow')}3 项计划</button>
  <span class="item hide-narrow">${icon('git-commit-horizontal')}main · 3 待提交</span>
  <button class="item" data-action="go" data-page="notifications">${icon('bell')}${DATA.unread()} 未读</button>`);
}

/* ---------- Toast ---------- */
function toast(msg, { kind = 'success', action, onAction, duration = 4200 } = {}) {
  const id = nextId('t'); const wrap = $('#toasts');
  const el = document.createElement('div'); el.className = `toast toast-${kind}`; el.id = id; el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.innerHTML = html(h`${icon(kind === 'error' ? 'circle-alert' : kind === 'info' ? 'info' : 'circle-check')}<span class="toast-msg">${msg}</span>${action ? h`<button class="btn" data-toast-action>${action}</button>` : ''}<button class="btn btn-icon" aria-label="关闭通知" data-toast-close>${icon('x', 'ico-sm')}</button>`);
  wrap.appendChild(el);
  const close = () => el.remove();
  el.querySelector('[data-toast-close]').onclick = close;
  if (action) el.querySelector('[data-toast-action]').onclick = () => { close(); onAction?.(); };
  setTimeout(close, duration);
  return id;
}

/* ---------- Overlay stack: dialog / popover / command ---------- */
const layers = [];
function syncLayerInert(){
 const top=layers.at(-1);const modal=top && top.modal!==false;
 $('#app').inert=!!modal;
 for(const l of layers)l.host.inert=!!modal && l!==top;
}
function trapFocus(container, e) {
  const f = $$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),a[href]', container).filter(x => x.offsetParent !== null || x === document.activeElement);
  if (!f.length) return; const first = f[0], last = f[f.length - 1];
  if(!container.contains(document.activeElement)){first.focus();e.preventDefault();return;}
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}
function openLayer({ kind, content, anchor, className = '', onClose, label = '', modal = true, guard }) {
  const ret = document.activeElement;
  const host = document.createElement('div');
  let box;
  if (kind === 'dialog') {
    host.className = 'overlay'; host.innerHTML = html(h`<div class="dialog ${className}" role="dialog" aria-modal="true" aria-label="${label}">${content}</div>`);
    box = host.firstElementChild;
    host.addEventListener('mousedown', e => { if (e.target === host) closeTop(); });
  } else if (kind === 'popover') {
    host.className = `popover ${className}`; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', label); host.innerHTML = html(content); box = host;
  }
  document.body.appendChild(host);
  if (kind === 'popover' && anchor) placePopover(host, anchor);
  const layer = { kind, host, box, ret, onClose, modal, guard };
  host.style.zIndex = String(60 + layers.length * 10);
  layers.push(layer);
  syncLayerInert();
  requestAnimationFrame(() => { const t = box.querySelector('[autofocus],[data-autofocus]') || box.querySelector('input,select,textarea,button'); t?.focus(); });
  return layer;
}
function placePopover(el, anchor) {
  const r = anchor.getBoundingClientRect(); const w = el.offsetWidth, hgt = el.offsetHeight;
  let left = Math.min(Math.max(8, r.left), innerWidth - w - 8); let top = r.bottom + 6;
  if (top + hgt > innerHeight - 8) top = Math.max(8, r.top - hgt - 6);
  el.style.left = `${left}px`; el.style.top = `${top}px`;
}
function closeTop(force = false) {
  const l = layers[layers.length - 1]; if (!l) return false;
  if (!force && l.guard && l.guard() === false) return true;
  layers.pop(); l.host.remove(); l.onClose?.(); syncLayerInert();
  if (l.ret && l.ret.isConnected) l.ret.focus();
  return true;
}
function closeAll() { while (layers.length) closeTop(true); }
function confirmDialog({ title, body, confirm = '确认', danger = false, onConfirm, cancel = '取消' }) {
  openLayer({ kind: 'dialog', className: 'dialog-sm', label: title, content: h`<div class="dialog-head">${danger ? h`<span class="dialog-danger-icon">${icon('triangle-alert')}</span>` : ''}<div><h2>${title}</h2><p>${body}</p></div></div>
    <div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">${cancel}</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="layer-confirm" data-autofocus>${confirm}</button></div>` });
  layers[layers.length - 1].onConfirm = onConfirm;
}
function menu(anchor, items, label = '更多操作') {
  const content = h`<div role="menu" aria-label="${label}">${items.map(it => it === '-' ? raw('<div class="menu-sep" role="separator"></div>') : h`<button class="menu-item ${it.danger ? 'danger' : ''}" role="menuitem" data-menu="${it.id}">${it.icon ? icon(it.icon) : ''}<span>${it.label}</span>${it.kbd ? h`<span class="kbd">${it.kbd}</span>` : ''}</button>`)}</div>`;
  const l = openLayer({ kind: 'popover', content, anchor, label });
  l.host.addEventListener('click', e => { const b = e.target.closest('[data-menu]'); if (!b) return; const it = items.find(x => x.id === b.dataset.menu); closeTop(true); it?.run?.(); });
  l.host.addEventListener('keydown', e => { if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return; const all = $$('[data-menu]', l.host); const i = all.indexOf(document.activeElement); all[(i + (e.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length].focus(); e.preventDefault(); });
}

/* ---------- Command palette ---------- */
function openCommand() {
  if (layers.some(l => l.cmd)) return;
  const ret = document.activeElement;
  const host = document.createElement('div'); host.className = 'cmd-overlay';
  host.innerHTML = html(h`<div class="cmd" role="dialog" aria-modal="true" aria-label="命令面板"><div class="cmd-input">${icon('search', 'ico-lg')}<input id="cmd-q" placeholder="搜索页面、命令、档案与任务…" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list" autocomplete="off"><span class="kbd">Esc</span></div><div class="cmd-list" id="cmd-list" role="listbox"></div><div class="cmd-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span>选择</span><span><span class="kbd">↵</span>打开</span><span><span class="kbd">Esc</span>关闭</span></div></div>`);
  document.body.appendChild(host);
  const layer = { kind: 'cmd', cmd: true, host, ret, box: host.firstElementChild };
  host.style.zIndex = String(60 + layers.length * 10);
  layers.push(layer);
  syncLayerInert();
  host.addEventListener('mousedown', e => { if (e.target === host) closeTop(); });
  const all = () => [
    ...[...RAIL, ...RAIL_END].map(([id, label, ic]) => ({ group: '前往', label, icon: ic, run: () => go(id) })),
    { group: '命令', label: '新建任务', icon: 'plus', hint: 'N', run: () => { go('tasks'); PAGES.tasks.newTask(); } },
    { group: '命令', label: '新建自动化', icon: 'workflow', run: () => { go('automations'); PAGES.automations.openNew(); } },
    { group: '命令', label: '快速取密', icon: 'key-round', run: () => { go('safe'); PAGES.safe.quick(); } },
    { group: '命令', label: '开始数据体检', icon: 'heart-pulse', run: () => { go('health'); PAGES.health.start(); } },
    { group: '命令', label: '切换浅色 / 深色', icon: 'moon', run: () => { S.mode = S.theme === 'ink' ? 'light' : 'dark'; savePrefs(); render(); } },
    { group: '命令', label: '外观设置', icon: 'palette', run: () => { go('settings'); } },
    ...DATA.tasks.slice(0, 6).map(t => ({ group: '任务', label: t.title, icon: t.done ? 'circle-check' : 'circle', run: () => { go('tasks'); PAGES.tasks.select(t.id); } })),
    ...DATA.records.slice(0, 8).map(r => ({ group: '档案', label: r.title, icon: DATA.typeOf(r.type).icon, hint: DATA.typeOf(r.type).name, run: () => { go('archives'); PAGES.archives.openRecord(r.id); } })),
  ];
  let sel = 0, items = [];
  const draw = () => {
    const q = $('#cmd-q').value.trim().toLowerCase();
    items = all().filter(x => !q || x.label.toLowerCase().includes(q) || (x.hint || '').toLowerCase().includes(q));
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let g = '';
    $('#cmd-list').innerHTML = items.length ? items.map((x, i) => { const head = x.group !== g ? `<div class="cmd-group">${esc(x.group)}</div>` : ''; g = x.group; return head + html(h`<button class="cmd-item" role="option" id="cmd-opt-${i}" data-i="${i}" aria-selected="${i === sel}">${icon(x.icon)}<span class="truncate">${x.label}</span>${x.hint ? h`<span class="hint">${x.hint}</span>` : ''}</button>`); }).join('') : html(h`<div class="empty" style="min-height:160px"><p>没有匹配“${$('#cmd-q').value}”的结果</p></div>`);
    $('#cmd-q').setAttribute('aria-activedescendant', items.length ? `cmd-opt-${sel}` : '');
    $(`#cmd-opt-${sel}`)?.scrollIntoView({ block: 'nearest' });
  };
  const run = i => { const x = items[i]; if (!x) return; closeTop(true); x.run(); };
  $('#cmd-q').addEventListener('input', () => { sel = 0; draw(); });
  $('#cmd-q').addEventListener('keydown', e => {
    if (e.isComposing) return;
    if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  $('#cmd-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
  draw(); $('#cmd-q').focus();
}

/* ---------- DateField (spec: DayPicker v10 + Popover; prototype: Air Datepicker) ---------- */
const AIR_ZH = window.__airLocaleZh;
const pickers = new Set();
function dateField({ id, value = '', label = '日期', placeholder = '年-月-日', required = false, min = '', max = '', time = false, describedBy = '' }) {
  return h`<div class="datefield" data-datefield="${id}" data-min="${min}" data-max="${max}" data-time="${time ? '1' : ''}" data-required="${required ? '1' : ''}">${icon(time ? 'clock' : 'calendar')}
    <input class="input" id="${id}" value="${value}" placeholder="${time ? '年-月-日 时:分' : placeholder}" inputmode="numeric" autocomplete="off" aria-label="${label}" ${describedBy ? raw(`aria-describedby="${describedBy}"`) : ''} ${required ? raw('aria-required="true"') : ''}>
    <button type="button" class="df-clear" data-df-clear aria-label="清除${label}" ${value ? '' : raw('hidden')}>${icon('x', 'ico-sm')}</button></div>`;
}
function parseDateInput(s, time) {
  if (!time) return parseYmd(s);
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})$/.exec(String(s).trim()); if (!m) return null;
  const d = parseYmd(m[1]); const hh = +m[2], mm = +m[3]; if (!d || hh > 23 || mm > 59) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm);
}
const fmtDateInput = (d, time) => time ? `${ymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : ymd(d);
function mountDateFields(root = document, onChange = () => { }) {
  $$('[data-datefield]', root).forEach(wrap => {
    if (wrap.__dp) return;
    const input = wrap.querySelector('input'), clear = wrap.querySelector('[data-df-clear]');
    const time = !!wrap.dataset.time, min = parseYmd(wrap.dataset.min), max = parseYmd(wrap.dataset.max);
    const err = () => wrap.parentElement.querySelector('.field-error[data-for="' + input.id + '"]');
    const setError = msg => {
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      let e = err();
      if (msg && !e) { e = document.createElement('div'); e.className = 'field-error'; e.dataset.for = input.id; e.id = input.id + '-err'; wrap.after(e); }
      if (e) { if (msg) { e.innerHTML = html(h`${icon('circle-alert')}<span>${msg}</span>`); input.setAttribute('aria-describedby', e.id); } else { e.remove(); input.removeAttribute('aria-describedby'); } }
    };
    const dp = new AirDatepicker(input, {
      locale: AIR_ZH, autoClose: !time, timepicker: time, dateFormat: 'yyyy-MM-dd', timeFormat: 'HH:mm', firstDay: 1,
      minDate: min || '', maxDate: max || '', classes: 'hu-dp', position: 'bottom left', keyboardNav: true, toggleSelected: false,
      buttons: [{ content: '今天', onClick: d => d.selectDate(TODAY) }, { content: '清除', onClick: d => { d.clear(); input.value = ''; commit(); d.hide(); } }],
      selectedDates: parseDateInput(input.value, time) ? [parseDateInput(input.value, time)] : [],
      onSelect: ({ date }) => { if (date) { input.value = fmtDateInput(date, time); commit(); } },
      onShow: () => { dp.$datepicker.classList.add('hu-dp'); dp.$datepicker.style.zIndex = String(70 + layers.length * 10); },
    });
    let last = input.value.trim() || null;
    const emit = v => { if (v === last) return; last = v; onChange(input.id, v); };
    function commit() {
      if (!wrap.isConnected) return;
      const v = input.value.trim(); clear.hidden = !v;
      if (!v) { if (wrap.dataset.required) { setError('请填写日期'); return; } setError(''); emit(null); return; }
      const d = parseDateInput(v, time);
      if (!d) { setError(time ? '请输入有效日期时间，例如 2026-11-05 09:30' : '请输入有效日期，例如 2026-11-05'); return; }
      if (min && d < min) { setError(`不能早于 ${ymd(min)}`); return; }
      if (max && d > max) { setError(`不能晚于 ${ymd(max)}`); return; }
      setError(''); emit(fmtDateInput(d, time));
    }
    input.addEventListener('blur', () => setTimeout(() => { if (!dp.visible) commitTyped(); }, 120));
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { commitTyped(); if (dp.visible) dp.hide(); e.preventDefault(); } });
    // Esc closes only the calendar first; capture runs before Air and the page-level Esc handler.
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && dp.visible) { dp.hide(); e.stopPropagation(); e.preventDefault(); } }, true);
    function commitTyped() { const d = parseDateInput(input.value, time); if (d) dp.selectDate(d, { silent: true }); commit(); }
    clear.addEventListener('click', () => { dp.clear({ silent: true }); input.value = ''; commit(); input.focus(); });
    wrap.__dp = dp; pickers.add(dp);
  });
}
function destroyPickers() { pickers.forEach(p => { try { if (!p.$el.isConnected) { p.destroy(); pickers.delete(p); } } catch { pickers.delete(p); } }); }
/* DateRangeField: one trigger, draft range, apply/cancel. */
function dateRangeTrigger(id, range) {
  const active = range.from || range.to;
  const label = active ? `${range.from ? relDay(range.from) : '…'} – ${range.to ? relDay(range.to) : '…'}` : '日期范围';
  return h`<span class="row" style="gap:2px"><button class="daterange" id="${id}" data-action="daterange" data-active="${!!active}" aria-haspopup="dialog" aria-label="日期范围：${active ? label : '未设置'}">${icon('calendar-days', 'ico-sm')}<span>${label}</span>${icon('chevron-down', 'ico-sm')}</button>${active ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="daterange-clear" aria-label="清除日期范围">${icon('x', 'ico-sm')}</button>` : ''}</span>`;
}
function openDateRange(anchor, range, onApply) {
  let draft = { ...range };
  const content = h`<div class="dr-pop"><div class="dr-presets">${[['今天', 0, 0], ['未来 7 天', 0, 6], ['本月', 'm'], ['过去 30 天', -29, 0]].map(([l, a, b]) => h`<button class="btn btn-secondary btn-sm" data-preset="${a}|${b ?? ''}">${l}</button>`)}</div>
    <div class="dr-fields"><input class="input input-sm" id="dr-from" placeholder="开始 年-月-日" value="${draft.from || ''}" aria-label="开始日期"><span class="muted">至</span><input class="input input-sm" id="dr-to" placeholder="结束 年-月-日" value="${draft.to || ''}" aria-label="结束日期"></div>
    <div class="dr-inline" id="dr-cal"></div><div class="field-error" id="dr-err" hidden></div>
    <div class="dr-foot"><button class="btn btn-ghost btn-sm" data-dr="clear">清除</button><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-dr="cancel">取消</button><button class="btn btn-primary btn-sm" data-dr="apply">应用</button></div></div>`;
  const l = openLayer({ kind: 'popover', content, anchor, label: '选择日期范围' });
  const cal = new AirDatepicker($('#dr-cal', l.host), { inline: true, range: true, locale: AIR_ZH, firstDay: 1, classes: 'hu-dp', dynamicRange: true, toggleSelected: false,
    selectedDates: [parseYmd(draft.from), parseYmd(draft.to)].filter(Boolean),
    onSelect: ({ date }) => { const [a, b] = Array.isArray(date) ? date : [date]; draft = { from: a ? ymd(a) : null, to: b ? ymd(b) : null }; $('#dr-from', l.host).value = draft.from || ''; $('#dr-to', l.host).value = draft.to || ''; validate(); } });
  placePopover(l.host, anchor);
  const validate = () => {
    const f = $('#dr-from', l.host).value.trim(), t = $('#dr-to', l.host).value.trim(); const e = $('#dr-err', l.host);
    let msg = '';
    if (f && !parseYmd(f)) msg = '开始日期无效'; else if (t && !parseYmd(t)) msg = '结束日期无效'; else if (f && t && parseYmd(t) < parseYmd(f)) msg = '结束日期不能早于开始日期';
    e.hidden = !msg; e.innerHTML = msg ? html(h`${icon('circle-alert')}<span>${msg}</span>`) : '';
    $('[data-dr="apply"]', l.host).disabled = !!msg; draft = { from: f || null, to: t || null }; return !msg;
  };
  ['#dr-from', '#dr-to'].forEach(s => $(s, l.host).addEventListener('input', validate));
  l.host.addEventListener('click', e => {
    const p = e.target.closest('[data-preset]');
    if (p) { const [a, b] = p.dataset.preset.split('|'); let from, to; if (a === 'm') { from = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1); to = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0); } else { from = addDays(TODAY, +a); to = addDays(TODAY, +b); } cal.selectDate([from, to]); return; }
    const b = e.target.closest('[data-dr]'); if (!b) return;
    if (b.dataset.dr === 'cancel') closeTop(true);
    if (b.dataset.dr === 'clear') { closeTop(true); onApply({ from: null, to: null }); }
    if (b.dataset.dr === 'apply' && validate()) { closeTop(true); onApply(draft); }
  });
  l.onClose = () => cal.destroy();
}

/* ---------- Navigation ---------- */
function go(id, { state = null } = {}) {
  closeAll();
  if (S.page !== id) { PAGES[S.page]?.leave?.(); }
  S.scene = id === 'notes' ? 'notes' : 'workbench';
  if (id !== 'notes') S.page = id;
  S.panelSheet = false;
  const p = PAGES[id];
  S.state = state || p.states[0];
  (p.enter || p.applyState)?.call(p,S.state);
  render(); destroyPickers();
  if (id !== 'notes') {const region=S.detailOpen && $('#app').dataset.detailMode==='sheet'?$('#detail'):$('#main');(region?.querySelector('button,input,textarea')||region)?.focus({preventScroll:true});}
}
function setState(state) { const p = S.scene === 'notes' ? PAGES.notes : page(); S.state = state; p.applyState?.(state); render(); destroyPickers(); }

/* ---------- Prototype state controls (not product UI) ---------- */
function syncProto() {
  const pp = $('#page-picker'), sp = $('#state-picker'); if (!pp) return;
  const cur = S.scene === 'notes' ? 'notes' : S.page;
  pp.value = cur; const p = PAGES[cur];
  sp.innerHTML = p.states.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join(''); sp.value = S.state;
}
function buildProtoControls() {
  const box = document.createElement('div'); box.id = 'proto-controls'; box.hidden = true;
  box.innerHTML = html(h`<div class="field"><label class="field-label" for="page-picker">页面</label><select class="select" id="page-picker">${Object.entries(PAGES).map(([id, p]) => h`<option value="${id}">${p.title}（${id}）</option>`)}</select></div>
    <div class="field"><label class="field-label" for="state-picker">状态</label><select class="select" id="state-picker"></select></div>
    <div class="field"><label class="field-label" for="width-note">尺寸</label><p class="field-help" id="width-note">按所属叶子宽度重排：≥960 宽、600–959 中、&lt;600 窄。调整浏览器窗口宽度即可预览。</p></div>`);
  document.body.appendChild(box);
  $('#page-picker').addEventListener('change', e => go(e.target.value));
  $('#state-picker').addEventListener('change', e => setState(e.target.value));
}
function openProto(anchor) {
  const box = $('#proto-controls');
  const l = openLayer({ kind: 'popover', content: '', anchor, className: 'proto-pop', label: '原型状态', modal: false });
  box.hidden = false; l.host.appendChild(box); placePopover(l.host, anchor);
  l.onClose = () => { box.hidden = true; document.body.appendChild(box); };
}

/* ---------- Global events ---------- */
const ACTIONS = {
  go: el => go(el.dataset.page, {state:el.dataset.state}),
  scene: el => { if (el.dataset.scene === 'notes') { closeAll(); S.scene = 'notes'; S.state = PAGES.notes.states[0]; render(); } else go(S.page); },
  cmd: () => openCommand(),
  proto: el => openProto(el),
  'toggle-mode': () => { S.mode = S.theme === 'ink' ? 'light' : 'dark'; savePrefs(); render(); },
  'toggle-panel': () => { S.panelSheet = !S.panelSheet; renderPanel(); if (S.panelSheet) $('#panel button,#panel input')?.focus(); },
  scrim: () => { if (S.panelSheet) { S.panelSheet = false; renderPanel(); $('.panel-toggle')?.focus(); } else page().closeDetail?.(); },
  'layer-close': () => closeTop(),
  'layer-confirm': () => { const l = layers[layers.length - 1]; const fn = l?.onConfirm; closeTop(true); fn?.(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]'); if (!el || el.disabled) return;
  const name = el.dataset.action;
  const fn = ACTIONS[name] || (S.scene === 'notes' ? PAGES.notes : page()).actions?.[name];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('keydown', e => {
  if (e.isComposing) return;
  const mod = e.metaKey || e.ctrlKey;

  if (e.key === 'Escape') {
    if (layers.length) { e.preventDefault(); closeTop(); return; }
    if (S.panelSheet) { S.panelSheet = false; renderPanel(); $('.panel-toggle')?.focus(); return; }
    if (S.detailOpen && page().closeDetail) { page().closeDetail(); return; }
  }
  if (e.key === 'Tab' && layers.length && layers[layers.length - 1].modal !== false) trapFocus(layers[layers.length - 1].box || layers[layers.length - 1].host, e);
  const modal = layers.at(-1)?.modal !== false && layers.length ? layers.at(-1).box : S.panelSheet ? $('#panel') : S.detailOpen && $('#app').dataset.detailMode === 'sheet' ? $('#detail') : null;
  if (modal && e.key === 'Tab') { trapFocus(modal,e); return; }
  if (modal && e.key === 'F6') { e.preventDefault(); return; }
  if (e.key === 'F6') { e.preventDefault(); const regions = ['#rail', '#panel:not([hidden])', '#main', '#detail:not([hidden])'].map(s => $(s)).filter(Boolean); const i = regions.findIndex(r => r.contains(document.activeElement)); const n = regions[(i + (e.shiftKey ? -1 : 1) + regions.length) % regions.length]; (n.querySelector('button,input,[tabindex="0"]') || n).focus(); }
});
/* Panel resize: drag, double-click reset, arrow keys step 8px */
document.addEventListener('pointerdown', e => {
  const hnd = e.target.closest('.panel-resize'); if (!hnd) return;
  e.preventDefault(); hnd.classList.add('dragging'); const x0 = e.clientX, w0 = S.panelW;
  const mv = ev => { S.panelW = Math.max(220, Math.min(480, w0 + ev.clientX - x0)); document.documentElement.style.setProperty('--hu-panel-w', S.panelW + 'px'); hnd.setAttribute('aria-valuenow', S.panelW); };
  const up = () => { hnd.classList.remove('dragging'); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); savePrefs(); measure(); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up);
});
document.addEventListener('dblclick', e => { if (e.target.closest('.panel-resize')) { S.panelW = 272; savePrefs(); applyTheme(); } });
document.addEventListener('keydown', e => { const hnd = e.target.closest?.('.panel-resize'); if (!hnd || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return; S.panelW = Math.max(220, Math.min(480, S.panelW + (e.key === 'ArrowRight' ? 8 : -8))); hnd.setAttribute('aria-valuenow', S.panelW); applyTheme(); savePrefs(); e.preventDefault(); });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { const before = S.width + $('#app').dataset.detailMode; measure(); if (before !== S.width + $('#app').dataset.detailMode) render(); }, 60); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (S.mode === 'system') render(); });

/* ---------- Demo data (fictional; no real accounts or secrets) ---------- */
const DATA = {
  tasks: [
    { id: 't1', title: '确认右侧详情的宽度切换阈值', note: '主区剩余宽度不足 640px 时改为覆盖 Sheet', due: '2026-11-05', done: false, link: '工作台规范' },
    { id: 't2', title: '整理按钮、字段与色彩 token', note: '收敛到语义 token，删除页面局部颜色', due: '2026-11-04', done: false },
    { id: 't3', title: '日期组件接入 DayPicker v10', note: '中文 locale、范围选择、所属窗口 Portal', due: '2026-11-06', done: false, link: '复用调研' },
    { id: 't4', title: '每周整理项目档案与关联资料', note: '', due: '2026-11-07', done: false, repeat: '每周五' },
    { id: 't5', title: '读完《设计中的设计》第 4 章', note: '摘录信息与形式的段落', due: '2026-11-08', done: false },
    { id: 't6', title: '检查窄分屏与弹出窗口的焦点', note: '', due: null, done: false },
    { id: 't7', title: '更换净水器滤芯', note: '型号 RO-600，已在归物本登记', due: '2026-11-12', done: false, link: '净水器' },
    { id: 't8', title: '导出 10 月账单并归档', note: '', due: '2026-11-03', done: true, doneAt: '2026-11-03' },
    { id: 't9', title: '评审档案目录树的展开逻辑', note: '展开与选中分开操作', due: '2026-11-02', done: true, doneAt: '2026-11-02' },
  ],
  types: [
    { id: 'person', name: '人物', icon: 'user', color: '#9A6B8A' },
    { id: 'item', name: '归物', icon: 'package', color: '#B08A3E' },
    { id: 'book', name: '书籍', icon: 'book', color: '#2C6669' },
    { id: 'project', name: '项目', icon: 'folder', color: '#6E8BA8' },
  ],
  records: [
    { id: 'r-p1', type: 'person', title: '林知微', fields: { 关系: '大学同学', 城市: '杭州', 生日: '1994-03-18', 标签: ['朋友', '设计'] }, updated: '2026-11-04' },
    { id: 'r-p2', type: 'person', title: '周以安', fields: { 关系: '同事', 城市: '上海', 生日: '1991-09-02', 标签: ['工作'] }, updated: '2026-10-28' },
    { id: 'r-p3', type: 'person', title: '陈默', fields: { 关系: '邻居', 城市: '广州', 生日: '', 标签: [] }, updated: '2026-10-12' },
    { id: 'r-i1', type: 'item', title: '净水器 RO-600', fields: { 状态: '使用中', 购入: '2025-06-18', 价格: '¥2,399.00', 位置: '厨房', 保修至: '2027-06-18' }, updated: '2026-11-01' },
    { id: 'r-i2', type: 'item', title: '机械键盘 K8', fields: { 状态: '使用中', 购入: '2024-02-10', 价格: '¥599.00', 位置: '书房' }, updated: '2026-09-22' },
    { id: 'r-i3', type: 'item', title: '胶片相机 FM2', fields: { 状态: '已转卖', 购入: '2021-05-01', 价格: '¥2,800.00', 退出: '2026-08-14', 回收: '¥3,100.00' }, updated: '2026-08-14' },
    { id: 'r-i4', type: 'item', title: '登山包 45L', fields: { 状态: '闲置', 购入: '2023-04-11', 价格: '¥899.00', 位置: '储物间' }, updated: '2026-07-01' },
    { id: 'r-b1', type: 'book', title: '设计中的设计', fields: { 作者: '原研哉', 状态: '在读', 评分: 4, 开始: '2026-10-20' }, updated: '2026-11-03' },
    { id: 'r-b2', type: 'book', title: '写给大家看的设计书', fields: { 作者: 'Robin Williams', 状态: '已读', 评分: 5, 开始: '2026-08-02' }, updated: '2026-09-01' },
    { id: 'r-b3', type: 'book', title: '人机交互的设计心理', fields: { 作者: 'Don Norman', 状态: '想读', 评分: 0, 开始: '' }, updated: '2026-06-11' },
    { id: 'r-j1', type: 'project', title: 'HUHU 工作台重构', fields: { 阶段: '设计', 开始: '2026-11-01', 负责人: '我' }, updated: '2026-11-05' },
    { id: 'r-j2', type: 'project', title: '家庭照片整理', fields: { 阶段: '进行中', 开始: '2026-09-10', 负责人: '我' }, updated: '2026-10-30' },
  ],
  views: [{ id: 'v1', name: '在读书籍', type: 'book' }, { id: 'v2', name: '保修将到期', type: 'item' }],
  journal: [
    { id: 'j1', person: 'r-p1', date: '2026-11-01', title: '一起看了展', body: '在西溪天堂聊到她新开的工作室，约好下个月去拍照。' },
    { id: 'j2', person: 'r-p1', date: '2026-09-15', title: '生日礼物', body: '送了一本《纸上的建筑》，她很喜欢。' },
  ],
  automations: [
    { id: 'a1', name: '每日晨间简报', trigger: '每天 08:00', kind: 'agent', action: '智能体生成今日任务摘要', device: '这台电脑', cwd: 'huhu/journal', enabled: true, last: { at: '今天 08:00', status: 'success', dur: '42 秒' }, next: '明天 08:00' },
    { id: 'a2', name: '周五整理项目档案', trigger: '每周五 17:30', kind: 'script', action: '运行脚本 archive-weekly.sh', device: '这台电脑', cwd: 'huhu/projects', enabled: true, last: { at: '10月31日 17:30', status: 'success', dur: '8 秒' }, next: '周五 17:30' },
    { id: 'a3', name: '同步阅读高亮', trigger: '每 6 小时', kind: 'sync', action: '导入阅读器高亮到书籍档案', device: '这台电脑', cwd: 'huhu/books', enabled: false, last: { at: '11月2日 12:00', status: 'failed', dur: '3 秒', error: '阅读器导出目录不存在：~/Reading/Export' }, next: '已停用' },
    { id: 'a4', name: '月末账单归档', trigger: '每月最后一天 21:00', kind: 'script', action: '生成月度账单并移动附件', device: '工作电脑', cwd: 'huhu/finance', enabled: true, last: { at: '10月31日 21:00', status: 'success', dur: '1 分 12 秒' }, next: '11月30日 21:00' },
    { id: 'a5', name: '保修到期提醒', trigger: '每天 09:00', kind: 'notify', action: '检查归物保修并发送通知', device: '这台电脑', cwd: 'huhu/belongings', enabled: true, last: { at: '今天 09:00', status: 'running', dur: '' }, next: '明天 09:00' },
    { id: 'a6', name: 'Git 自动提交笔记', trigger: '每 30 分钟', kind: 'script', action: 'git add / commit 笔记变更', device: '这台电脑', cwd: '/', enabled: false, last: { at: '10月20日 22:30', status: 'success', dur: '2 秒' }, next: '已停用' },
  ],
  runs: [
    { id: 'run-1', auto: 'a1', at: '今天 08:00', status: 'success', dur: '42 秒', out: '已生成 2026-11-05 晨间简报：5 项待办、1 项逾期、2 个会话等待处理。' },
    { id: 'run-2', auto: 'a1', at: '昨天 08:00', status: 'success', dur: '38 秒', out: '已生成 2026-11-04 晨间简报。' },
    { id: 'run-3', auto: 'a1', at: '11月3日 08:00', status: 'failed', dur: '5 秒', out: '账号额度已用尽，下次调度时重试。' },
    { id: 'run-4', auto: 'a3', at: '11月2日 12:00', status: 'failed', dur: '3 秒', out: 'ENOENT: ~/Reading/Export' },
    { id: 'run-5', auto: 'a2', at: '10月31日 17:30', status: 'success', dur: '8 秒', out: '整理 6 个项目档案，更新 14 处关联。' },
  ],
  sessions: [
    { id: 's1', agent: 'Claude', title: 'huhu · 设计 token 收敛', cwd: '~/projects/obsidian-huhu', status: 'working', model: 'Opus 5.5', tokens: '18.2k', ws: 'obsidian-huhu' },
    { id: 's2', agent: 'Codex', title: 'review · tree 虚拟滚动', cwd: '~/projects/obsidian-huhu', status: 'blocked', model: 'gpt-6.1', tokens: '9.4k', ws: 'obsidian-huhu' },
    { id: 's3', agent: 'Claude', title: '周报草稿', cwd: '~/vault', status: 'idle', model: 'Sonnet 5.5', tokens: '3.1k', ws: 'vault' },
  ],
  notifications: [
    { id: 'n1', title: '“同步阅读高亮”运行失败', body: '阅读器导出目录不存在：~/Reading/Export。修复路径后可手动重试。', source: '自动化', icon: 'workflow', at: '11月2日 12:00', read: false, kind: 'danger', target: 'automations' },
    { id: 'n2', title: 'Codex 需要你确认一项操作', body: '会话“review · tree 虚拟滚动”请求运行 pnpm test。', source: '智能体', icon: 'bot', at: '10 分钟前', read: false, kind: 'warning', target: 'agent' },
    { id: 'n3', title: '净水器保修将于 7 个月后到期', body: '净水器 RO-600 · 保修至 2027-06-18', source: '归物', icon: 'package', at: '今天 09:00', read: true, kind: 'info', target: 'archives' },
    { id: 'n4', title: '晨间简报已生成', body: '5 项待办，1 项逾期。', source: '自动化', icon: 'sparkles', at: '今天 08:00', read: true, kind: 'success', target: 'home' },
  ],
  vault: [
    { id: 'v-1', cat: 'login', title: 'GitHub', user: 'huhu-demo', secret: 'demo-Gh!9x2m', url: 'github.com', updated: '10月28日', note: '演示条目，非真实凭据' },
    { id: 'v-2', cat: 'login', title: '邮箱', user: 'me@example.com', secret: 'demo-Ml#4kq7', url: 'mail.example.com', updated: '9月12日' },
    { id: 'v-3', cat: 'login', title: '家用路由器', user: 'admin', secret: 'demo-Rt$8wz1', url: '192.168.1.1', updated: '6月3日' },
    { id: 'v-4', cat: 'card', title: '工资卡 · 尾号 0000', user: '示例银行', secret: '0000 0000 0000 0000', url: '', updated: '3月1日' },
    { id: 'v-5', cat: 'note', title: '家庭 Wi-Fi', user: 'HUHU-Home', secret: 'demo-wifi-pass', url: '', updated: '1月8日' },
  ],
  versions: [
    { id: 'c1', file: '产品周报.md', at: '今天 11:42', msg: '自动检查点', add: 12, del: 3, by: '自动' },
    { id: 'c2', file: '产品周报.md', at: '今天 09:15', msg: '补充“设计 token”小节', add: 28, del: 0, by: '手动' },
    { id: 'c3', file: '产品周报.md', at: '昨天 18:20', msg: '自动检查点', add: 4, del: 9, by: '自动' },
    { id: 'c4', file: '产品周报.md', at: '11月3日', msg: '初稿', add: 61, del: 0, by: '手动' },
  ],
  health: [],
  unread() { return this.notifications.filter(n => !n.read).length; },
  typeOf(id) { return this.types.find(t => t.id === id) || this.types[0]; },
};

/* ==========================================================================
   首页 · Dashboard
   ========================================================================== */
function taskCheck(t, { pending = false } = {}) {
  return h`<span class="check check-round ${pending ? 'is-pending' : ''}"><input type="checkbox" data-task-check="${t.id}" ${t.done ? raw('checked') : ''} aria-label="${t.done ? '重新打开' : '完成'}：${t.title}" ${pending ? raw('aria-busy="true"') : ''}>${CHECK_SVG}</span>`;
}
/* TaskContent: the single completion presentation shared by list, board, calendar and home. */
function taskContent(t, { note = true } = {}) {
  return h`<span class="task-content ${t.done ? 'is-done' : ''}"><span class="task-title">${t.title}</span>${note && t.note ? h`<span class="task-note">${t.note}</span>` : ''}</span>`;
}
function dueChip(t) {
  if (!t.due) return '';
  const d = parseYmd(t.due), n = dayDiff(d, TODAY);
  const cls = t.done ? '' : n < 0 ? 'is-overdue' : n === 0 ? 'is-today' : '';
  return h`<span class="due ${cls}">${icon('calendar', 'ico-sm')}${n < 0 && !t.done ? `逾期 · ${relDay(t.due)}` : relDay(t.due)}</span>`;
}

PAGES.home = {
  title: '首页', states: ['default', 'editing', 'empty', 'loading'],
  editing: false, board: 'b1',
  boards: [{ id: 'b1', name: '我的工作台', icon: 'layout-grid' }, { id: 'b2', name: '项目周报', icon: 'chart-column' }, { id: 'b3', name: '阅读与写作', icon: 'book-open' }],
  widgets: ['tasks', 'calendar', 'focus', 'usage', 'automations', 'capture', 'archives'],
  applyState(s) { this.editing = s === 'editing'; },
  panel() {
    return h`<div class="panel-head"><h2>看板</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="new-board" aria-label="新建看板">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${this.boards.map(b => h`<button class="nav-item" data-action="board" data-id="${b.id}" aria-current="${this.board === b.id}">${icon(b.icon)}<span class="truncate">${b.name}</span></button>`)}
    <div class="tree-group">快速入口</div>
    <button class="nav-item" data-action="go" data-page="tasks">${icon('list-checks')}<span>今天的任务</span><span class="count">4</span></button>
    <button class="nav-item" data-action="go" data-page="diary">${icon('notebook-pen')}<span>今天的日记</span></button>
    <button class="nav-item" data-action="go" data-page="home" data-state="inbox">${icon('inbox')}<span>收件箱</span><span class="count">${DATA.unread()}</span></button></div>`;
  },
  main() {
    const st = S.state, b = this.boards.find(x => x.id === this.board);
    const open = DATA.tasks.filter(t => !t.done), overdue = open.filter(t => t.due && parseYmd(t.due) < TODAY).length;
    const actions = this.editing
      ? h`<button class="btn btn-secondary" data-action="add-widget">${icon('plus')}添加小组件</button><button class="btn btn-primary" data-action="done-edit">${icon('check')}完成</button>`
      : h`<button class="btn btn-ghost" data-action="edit-layout">${icon('layout-grid')}编辑布局</button><button class="btn btn-primary" data-action="quick-task">${icon('plus')}新建任务<span class="kbd">N</span></button>`;
    if (st === 'empty') return h`${pageHead('新看板', { actions: h`<button class="btn btn-primary" data-action="add-widget">${icon('plus')}添加小组件</button>` })}<div class="page-body hu-scroll"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('layout-grid', 'ico-lg')}</span><h2>这个看板还是空的</h2><p>从任务、日历、专注计时、智能体用量等小组件开始，按自己的节奏布置。</p><div class="row"><button class="btn btn-primary" data-action="add-widget">${icon('plus')}添加小组件</button><button class="btn btn-secondary" data-action="board" data-id="b1">使用默认布局</button></div></div></div>`;
    return h`${pageHead(b.name, { actions })}
    <div class="page-body hu-scroll"><div class="page-pad home">
      <section class="greet"><div><p class="eyebrow">${fmtLong(ymd(TODAY))}</p><h2 class="greet-title">下午好，今天有 ${open.filter(t => t.due === ymd(TODAY)).length + overdue} 件事值得先做</h2>
      <p class="greet-sub">${overdue ? h`<span class="badge badge-danger">${overdue} 项逾期</span>` : ''}<span>2 个会话在运行</span><span class="sep"></span><span>下一个自动化 · 明天 08:00 晨间简报</span></p></div></section>
      ${this.editing ? h`<div class="notice notice-info" style="margin-bottom:16px">${icon('info')}<span>拖动手柄调整顺序，拖动右下角调整尺寸。原型中用“上移 / 下移”按钮演示排序。</span></div>` : ''}
      <div class="widgets ${this.editing ? 'is-editing' : ''}">${this.widgets.map((w, i) => this.widget(w, i, st === 'loading'))}</div>
    </div></div>`;
  },
  widget(w, i, loading) {
    const W = {
      tasks: ['今日任务', 'list-checks', 'w-7 h-2'], calendar: ['日历', 'calendar-days', 'w-5 h-2'], focus: ['专注', 'timer', 'w-3'], usage: ['智能体用量', 'activity', 'w-4'],
      automations: ['自动化', 'workflow', 'w-5'], capture: ['闪念', 'feather', 'w-5'], archives: ['最近档案', 'library', 'w-7'],
    }[w];
    const tools = this.editing
      ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="w-up" data-i="${i}" aria-label="上移 ${W[0]}" ${i === 0 ? raw('disabled') : ''}>${icon('chevron-up', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="w-down" data-i="${i}" aria-label="下移 ${W[0]}" ${i === this.widgets.length - 1 ? raw('disabled') : ''}>${icon('chevron-down', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="w-remove" data-i="${i}" aria-label="移除 ${W[0]}">${icon('x', 'ico-sm')}</button>`
      : h`<button class="btn btn-ghost btn-icon btn-sm" data-action="w-menu" data-w="${w}" aria-label="${W[0]} 更多操作">${icon('ellipsis', 'ico-sm')}</button>`;
    const body = loading ? h`<div class="card-body"><span class="skel skel-line" style="width:60%"></span><span class="skel skel-row"></span><span class="skel skel-row"></span></div>` : this['w_' + w]();
    return h`<section class="card widget ${W[2]}" aria-label="${W[0]}"><header class="card-head">${this.editing ? h`<span class="grip" aria-hidden="true">${icon('grip-vertical', 'ico-sm')}</span>` : ''}<h3 class="card-title">${icon(W[1])}${W[0]}</h3><span class="spacer"></span>${tools}</header>${body}</section>`;
  },
  w_tasks() {
    const list = DATA.tasks.filter(t => !t.done || t.doneAt === ymd(TODAY)).slice(0, 6);
    return h`<div class="card-body flush"><ul class="mini-tasks">${list.map(t => h`<li class="mini-task">${taskCheck(t, { pending: PAGES.tasks.pending.has(t.id) })}${taskContent(t, { note: false })}<span class="spacer"></span>${dueChip(t)}</li>`)}</ul>
      <form class="mini-add" data-form="home-add"><span class="ico-slot">${icon('plus', 'ico-sm')}</span><input class="input input-sm" name="title" placeholder="添加任务，回车保存" aria-label="添加任务"></form></div>`;
  },
  w_calendar() {
    const y = TODAY.getFullYear(), m = TODAY.getMonth(); const first = new Date(y, m, 1); const offset = (first.getDay() + 6) % 7; const days = new Date(y, m + 1, 0).getDate();
    const has = new Set(DATA.tasks.filter(t => t.due).map(t => t.due));
    const cells = []; for (let i = 0; i < offset; i++) cells.push(raw('<span></span>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); cells.push(h`<button class="cal-cell ${s === ymd(TODAY) ? 'is-today' : ''}" aria-label="${m + 1}月${d}日${has.has(s) ? '，有任务' : ''}" data-action="go" data-page="diary">${d}${has.has(s) ? raw('<i></i>') : ''}</button>`); }
    const agenda = DATA.tasks.filter(t => t.due && !t.done && dayDiff(parseYmd(t.due), TODAY) >= 0).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
    return h`<div class="card-body"><div class="mini-cal-head"><strong>${y}年${m + 1}月</strong><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-ghost btn-sm">今天</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div>
      <div class="mini-cal">${['一', '二', '三', '四', '五', '六', '日'].map(d => h`<span class="dow">${d}</span>`)}${cells}</div>
      <ul class="agenda">${agenda.map(t => h`<li><span class="agenda-day">${relDay(t.due)}</span><span class="truncate">${t.title}</span></li>`)}</ul></div>`;
  },
  w_focus() {
    return h`<div class="card-body focus"><div class="focus-ring" role="timer" aria-label="专注剩余 25 分钟"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="bar" style="stroke-dashoffset:${327 * 0.28}"/></svg><span class="focus-time num">18:04</span></div>
      <p class="muted" style="text-align:center">确认右侧详情阈值</p><div class="row" style="justify-content:center"><button class="btn btn-secondary btn-icon btn-sm" aria-label="暂停">${icon('pause', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="重置">${icon('rotate-ccw', 'ico-sm')}</button></div></div>`;
  },
  w_usage() {
    const bars = [34, 52, 41, 63, 48, 72, 58];
    return h`<div class="card-body"><div class="stat"><span class="stat-value num">34,770</span><span class="stat-label">本周 Tokens</span></div>
      <div class="bars" aria-label="近 7 天用量">${bars.map((v, i) => h`<span style="height:${v}%" class="${i === 6 ? 'is-today' : ''}" title="${v}%"></span>`)}</div>
      <div class="row muted" style="font-size:12px;margin-top:8px"><span>Claude 34%</span><span class="sep"></span><span>Codex 18%</span></div></div>`;
  },
  w_automations() {
    return h`<div class="card-body flush"><ul class="mini-list">${DATA.automations.slice(0, 4).map(a => h`<li><span class="dot ${a.last.status === 'success' ? 'dot-success' : a.last.status === 'failed' ? 'dot-danger' : a.last.status === 'running' ? 'dot-working' : ''}" aria-hidden="true"></span><span class="truncate grow">${a.name}</span><span class="muted num">${a.enabled ? a.next : '已停用'}</span></li>`)}</ul></div>`;
  },
  w_capture() {
    return h`<div class="card-body"><textarea class="textarea capture" placeholder="写下此刻的想法…  ⌘↵ 保存到收件箱" aria-label="闪念"></textarea><div class="row" style="margin-top:8px"><span class="muted" style="font-size:12px">今天已记录 3 条</span><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-action="capture-save">保存</button></div></div>`;
  },
  w_archives() {
    return h`<div class="card-body flush"><ul class="mini-list">${DATA.records.slice().sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4).map(r => { const t = DATA.typeOf(r.type); return h`<li><button class="mini-link" data-action="open-record" data-id="${r.id}">${icon(t.icon)}<span class="truncate grow">${r.title}</span><span class="badge">${t.name}</span><span class="muted num">${relDay(r.updated)}</span></button></li>`; })}</ul></div>`;
  },
  mount() { bindTaskChecks($('#main')); const f = $('[data-form="home-add"]'); f?.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.unshift({ id: nextId('t'), title: v, note: '', due: ymd(TODAY), done: false }); toast('已添加到今天'); renderMain(); $('[data-form="home-add"] input')?.focus(); }); },
  actions: {
    'edit-layout': () => { S.state = 'editing'; PAGES.home.editing = true; renderMain(); },
    'done-edit': () => { S.state = 'default'; PAGES.home.editing = false; renderMain(); toast('布局已保存'); },
    'w-up': el => { const w = PAGES.home.widgets, i = +el.dataset.i; [w[i - 1], w[i]] = [w[i], w[i - 1]]; renderMain(); },
    'w-down': el => { const w = PAGES.home.widgets, i = +el.dataset.i; [w[i + 1], w[i]] = [w[i], w[i + 1]]; renderMain(); },
    'w-remove': el => { const w = PAGES.home.widgets.splice(+el.dataset.i, 1)[0]; renderMain(); toast('已移除小组件', { action: '撤销', onAction: () => { PAGES.home.widgets.splice(+el.dataset.i, 0, w); renderMain(); } }); },
    'w-menu': el => menu(el, [{ id: 'cfg', label: '配置', icon: 'sliders-horizontal' }, { id: 'full', label: '打开完整页面', icon: 'maximize-2', run: () => go({ tasks: 'tasks', automations: 'automations', usage: 'agent', archives: 'archives' }[el.dataset.w] || 'home') }, '-', { id: 'rm', label: '移除', icon: 'trash-2', danger: true, run: () => { PAGES.home.widgets = PAGES.home.widgets.filter(x => x !== el.dataset.w); renderMain(); } }]),
    'add-widget': el => menu(el, ['tasks', 'calendar', 'focus', 'usage', 'automations', 'capture', 'archives'].filter(w => !PAGES.home.widgets.includes(w)).map(w => ({ id: w, label: { tasks: '今日任务', calendar: '日历', focus: '专注', usage: '智能体用量', automations: '自动化', capture: '闪念', archives: '最近档案' }[w], icon: 'plus', run: () => { PAGES.home.widgets.push(w); if (S.state === 'empty') S.state = 'editing'; PAGES.home.editing = true; renderMain(); } })).concat(PAGES.home.widgets.length === 7 ? [{ id: 'none', label: '全部小组件都已添加', icon: 'check' }] : []), '添加小组件'),
    board: el => { PAGES.home.board = el.dataset.id; S.state = 'default'; PAGES.home.editing = false; renderPanel(); renderMain(); },
    'new-board': () => { const id = nextId('b'); PAGES.home.boards.push({ id, name: '新看板', icon: 'layout-grid' }); PAGES.home.board = id; S.state = 'empty'; renderPanel(); renderMain(); },
    'quick-task': () => { go('tasks'); PAGES.tasks.newTask(); },
    'capture-save': () => { const t = $('.capture'); if (!t.value.trim()) { t.focus(); return; } t.value = ''; toast('已保存到收件箱'); },
    'open-record': el => { go('archives'); PAGES.archives.openRecord(el.dataset.id); },
  },
};

/* ==========================================================================
   任务 · list / board / calendar + inspector
   ========================================================================== */
function bindTaskChecks(root) {
  $$('[data-task-check]', root).forEach(cb => cb.addEventListener('click', e => { e.stopPropagation(); }));
  $$('[data-task-check]', root).forEach(cb => cb.addEventListener('change', () => PAGES.tasks.toggle(cb.dataset.taskCheck, cb.checked)));
}
PAGES.tasks = {
  title: '任务', states: ['default', 'board', 'calendar', 'detail', 'completed', 'pending', 'failed', 'empty', 'no-results', 'loading', 'error'],
  list: 'all', view: 'list', status: 'open', range: { from: null, to: null }, q: '', selected: null, pending: new Set(), failNext: false, leaving: new Set(),
  enter(s) { this.applyState(s); },
  applyState(s) {
    Object.assign(this, { view: 'list', status: 'open', q: '', selected: null, failNext: false, range: { from: null, to: null }, list: 'all' }); this.pending = new Set();
    if (s === 'board') this.view = 'board';
    if (s === 'calendar') this.view = 'calendar';
    if (s === 'detail') this.selected = 't1';
    if (s === 'completed') this.status = 'done';
    if (s === 'pending') this.pending.add('t2');
    if (s === 'failed') { this.failNext = true; }
    if (s === 'no-results') this.q = '季度预算';
    if (s === 'empty') this.list = 'p-empty';
  },
  lists() { return [['today', '今天', 'sun'], ['week', '未来 7 天', 'calendar-days'], ['inbox', '无日期', 'inbox'], ['all', '全部', 'list-todo'], ['done', '已完成', 'circle-check']]; },
  inList(t) {
    const l = this.list, d = t.due ? parseYmd(t.due) : null;
    if (l === 'today') return d && dayDiff(d, TODAY) <= 0 && !t.done;
    if (l === 'week') return d && dayDiff(d, TODAY) >= 0 && dayDiff(d, TODAY) < 7;
    if (l === 'inbox') return !t.due;
    if (l === 'done') return t.done;
    if (l === 'p-empty') return false;
    return true;
  },
  visible() {
    const q = this.q.trim().toLowerCase();
    return DATA.tasks.filter(t => this.inList(t))
      .filter(t => this.status === 'all' || (this.status === 'done' ? t.done : (!t.done || this.leaving.has(t.id) || this.pending.has(t.id))))
      .filter(t => !q || (t.title + t.note).toLowerCase().includes(q))
      .filter(t => { if (!this.range.from && !this.range.to) return true; if (!t.due) return false; return (!this.range.from || t.due >= this.range.from) && (!this.range.to || t.due <= this.range.to); });
  },
  listName() { return this.lists().find(x => x[0] === this.list)?.[1] || '任务'; },
  panel() {
    const cnt = id => { const keep = this.list; this.list = id; const n = DATA.tasks.filter(t => this.inList(t) && (id === 'done' || !t.done)).length; this.list = keep; return n; };
    return h`<div class="panel-head"><h2>任务</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="new-task" aria-label="新建任务">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${this.lists().map(([id, n, ic]) => h`<button class="nav-item" data-action="task-list" data-id="${id}" aria-current="${this.list === id}">${icon(ic)}<span>${n}</span><span class="count">${cnt(id) || ''}</span></button>`)}
      </div>`;
  },
  main() {
    const st = S.state;
    const views = h`<div class="seg" role="radiogroup" aria-label="视图">${[['list', '列表', 'list'], ['board', '看板', 'square-kanban'], ['calendar', '日历', 'calendar-days']].map(([v, l, ic]) => h`<button role="radio" aria-checked="${this.view === v}" data-action="task-view" data-v="${v}">${icon(ic, 'ico-sm')}<span class="hide-sm">${l}</span></button>`)}</div>`;
    const open = DATA.tasks.filter(t => this.inList(t) && !t.done).length;
    const head = pageHead(this.listName(), { sub: `${open} 项未完成`, actions: h`${views}<button class="btn btn-primary" data-action="new-task">${icon('plus')}<span class="hide-sm">新建任务</span></button>` });
    const toolbar = h`<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" id="task-q" placeholder="搜索任务" value="${this.q}" aria-label="搜索任务"></div>
      <div class="seg" role="radiogroup" aria-label="完成状态">${[['open', '未完成'], ['all', '全部'], ['done', '已完成']].map(([v, l]) => h`<button role="radio" aria-checked="${this.status === v}" data-action="task-status" data-v="${v}">${l}</button>`)}</div>
      ${dateRangeTrigger('task-range', this.range)}
      <button class="btn btn-ghost" data-action="task-sort" aria-haspopup="menu">${icon('arrow-up-down', 'ico-sm')}<span class="hide-sm">按截止日期</span></button></div>`;
    let body;
    if (st === 'loading') body = h`<div class="page-pad" aria-busy="true"><p class="loading-note" role="status"><span class="spinner"></span>正在读取任务…</p>${[1, 2, 3, 4, 5].map(() => raw('<span class="skel skel-row"></span>'))}</div>`;
    else if (st === 'error') body = h`<div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">任务读取失败</p><p>任务文件暂时无法读取，现有数据没有被修改。</p></div><button class="btn btn-secondary btn-sm" data-action="task-retry">${icon('refresh-cw', 'ico-sm')}重试</button></div></div>`;
    else body = h`<div id="task-body">${raw(this.bodyHTML())}</div>`;
    return h`${head}${toolbar}${st === 'failed' ? h`<div class="page-banner"><div class="notice notice-warning">${icon('triangle-alert')}<span>模拟写入失败已开启：下一次勾选完成会失败并恢复原状态。</span><button class="btn btn-ghost btn-sm" data-action="task-fail-off">关闭模拟</button></div></div>` : ''}<div class="page-body hu-scroll" id="task-scroll">${body}</div>`;
  },
  bodyHTML() {
    const items = this.visible();
    if (this.list === 'p-empty') return html(h`<div class="empty"><span class="empty-mark">${icon('list-todo', 'ico-lg')}</span><h2>这个项目还没有任务</h2><p>把项目拆成几件具体可做的事，完成时会划线保留在“全部”里。</p><div class="row"><button class="btn btn-primary" data-action="new-task">${icon('plus')}新建任务</button></div></div>`);
    if (!items.length) return html(h`<div class="empty"><span class="empty-mark">${icon('text-search', 'ico-lg')}</span><h2>没有符合条件的任务</h2><p>${this.q ? `没有找到包含“${this.q}”的任务。` : '当前筛选下没有任务。'}</p><div class="row"><button class="btn btn-secondary" data-action="task-clear">清除筛选</button></div></div>`);
    if (this.view === 'board') return html(this.board(items));
    if (this.view === 'calendar') return html(this.calendar(items));
    const groups = [['overdue', '逾期'], ['today', '今天'], ['tomorrow', '明天'], ['later', '之后'], ['none', '无日期'], ['done', '已完成']];
    const key = t => { if (t.done && !this.leaving.has(t.id)) return 'done'; if (!t.due) return 'none'; const n = dayDiff(parseYmd(t.due), TODAY); return n < 0 ? 'overdue' : n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'later'; };
    const sorted = items.slice().sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
    return html(h`<div class="task-list" role="list">${groups.map(([g, label]) => { const rows = sorted.filter(t => key(t) === g); if (!rows.length) return ''; return h`<div class="list-group-head">${label}<span class="count">${rows.length}</span></div>${rows.map(t => this.row(t))}`; })}
      <form class="task-add" data-form="task-add"><span class="ico-slot">${icon('plus')}</span><input class="input" name="title" placeholder="添加任务到“${this.listName()}”，回车保存" aria-label="快速添加任务"></form></div>`);
  },
  row(t) {
    const pend = this.pending.has(t.id);
    return h`<div class="list-row task-row ${pend ? 'is-pending' : ''} ${this.leaving.has(t.id) ? 'is-leaving' : ''}" role="listitem" data-task="${t.id}" aria-selected="${this.selected === t.id}" tabindex="0">${taskCheck(t, { pending: pend })}
      <div class="list-row-main">${taskContent(t)}<div class="list-row-meta">${dueChip(t)}${t.repeat ? h`<span class="meta-chip">${icon('refresh-cw', 'ico-sm')}${t.repeat}</span>` : ''}${t.link ? h`<span class="meta-chip">${icon('link', 'ico-sm')}${t.link}</span>` : ''}${pend ? h`<span class="meta-chip pending-chip"><span class="spinner" style="width:12px;height:12px"></span>正在保存</span>` : ''}</div></div>
      <div class="list-row-end"><button class="btn btn-ghost btn-icon btn-sm row-actions" data-action="task-menu" data-id="${t.id}" aria-label="${t.title} 更多操作">${icon('ellipsis', 'ico-sm')}</button></div></div>`;
  },
  board(items) {
    const cols = [['undated', '无日期', items.filter(t => !t.done && !t.due)], ['dated', '有日期', items.filter(t => !t.done && t.due)], ['done', '已完成', items.filter(t => t.done)]];
    return h`<div class="board">${cols.map(([id, name, list]) => h`<section class="board-col" aria-label="${name}"><header class="board-col-head"><span class="dot ${id === 'done' ? 'dot-success' : id === 'dated' ? 'dot-accent' : ''}"></span>${name}<span class="count">${list.length}</span><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" data-action="new-task" aria-label="在${name}中新建">${icon('plus', 'ico-sm')}</button></header>
      <div class="board-cards">${list.map(t => h`<article class="card card-interactive board-card" data-task="${t.id}" aria-selected="${this.selected === t.id}" tabindex="0"><div class="row" style="align-items:flex-start">${taskCheck(t)}${taskContent(t)}</div><div class="list-row-meta" style="margin-top:8px;padding-left:28px">${dueChip(t)}</div></article>`)}${list.length ? '' : raw('<p class="board-empty">此分组暂无任务</p>')}</div></section>`)}</div>`;
  },
  calendar(items) {
    const y = TODAY.getFullYear(), m = TODAY.getMonth(), first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const cells = []; for (let i = 0; i < off; i++) cells.push(raw('<div class="mcal-cell is-out"></div>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); const ts = items.filter(t => t.due === s); cells.push(h`<div class="mcal-cell ${s === ymd(TODAY) ? 'is-today' : ''}"><span class="mcal-day num">${d}</span>${ts.slice(0, 3).map(t => h`<button class="mcal-task ${t.done ? 'is-done' : ''}" data-task="${t.id}">${taskContent(t, { note: false })}</button>`)}${ts.length > 3 ? h`<span class="muted" style="font-size:12px">+${ts.length - 3}</span>` : ''}</div>`); }
    while (cells.length % 7) cells.push(raw('<div class="mcal-cell is-out"></div>'));
    return h`<div class="page-pad" style="padding-top:4px"><div class="mcal-head"><h2>${y}年${m + 1}月</h2><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-secondary btn-sm">今天</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div>
      <div class="mcal">${['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map(d => h`<div class="mcal-dow">${d}</div>`)}${cells}</div></div>`;
  },
  detail() {
    const t = DATA.tasks.find(x => x.id === this.selected); if (!t) return null;
    return h`<header class="detail-head">${taskCheck(t, { pending: this.pending.has(t.id) })}<h2 class="truncate">任务详情</h2><span class="save-state" id="task-save" aria-live="polite">已保存</span><button class="btn btn-ghost btn-icon btn-sm" data-action="task-menu" data-id="${t.id}" aria-label="更多操作">${icon('ellipsis', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="close-detail" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><textarea class="title-input ${t.done ? 'is-done' : ''}" id="td-title" rows="2" aria-label="任务标题">${t.title}</textarea>
      ${t.done ? h`<div class="notice notice-success" style="margin:8px 0 4px">${icon('circle-check')}<span>已于 ${relDay(t.doneAt || ymd(TODAY))} 完成</span><button class="btn btn-ghost btn-sm" data-action="task-reopen" data-id="${t.id}">重新打开</button></div>` : ''}
      <dl class="props" style="margin-top:12px">
        <div class="prop"><dt>截止日期</dt><dd>${dateField({ id: 'td-due', value: t.due || '', label: '截止日期' })}</dd></div>
        <div class="prop"><dt>计划日期</dt><dd>${dateField({id:"td-plan",value:t.planDate||"",label:"计划日期"})}</dd></div><div class="prop"><dt>时区</dt><dd>Asia/Shanghai</dd></div><div class="prop"><dt>提醒</dt><dd>${dateField({ id: 'td-remind', value: t.remind || '', label: '提醒时间', time: true })}</dd></div>
        <div class="prop"><dt>重复</dt><dd><span class="fg2">${t.repeat || '不重复'}</span></dd></div>
      </dl>
      <div class="field" style="margin-top:16px"><label class="field-label" for="td-note">备注</label><textarea class="textarea" id="td-note" placeholder="补充说明、链接或检查清单">${t.note}</textarea></div>
      <div class="section-title" style="margin-top:20px">关联资料</div>
      ${t.link ? h`<button class="link-card" data-action="go" data-page="archives">${icon('file-text')}<span class="grow truncate">${t.link}</span>${icon('arrow-up-right', 'ico-sm')}</button>` : h`<p class="muted" style="font-size:13px">还没有关联档案或笔记。</p>`}
      <p class="muted" style="font-size:12px;margin-top:20px">创建于 11月1日 · 最近修改 今天 10:24</p>
    </div>
    <footer class="detail-foot"><button class="btn btn-danger-ghost" data-action="task-delete" data-id="${t.id}">${icon('trash-2')}删除</button><span class="spacer"></span><button class="btn btn-secondary" data-action="close-detail">关闭</button></footer>`;
  },
  mount() {
    const main = $('#main');
    bindTaskChecks(main);
    $('#task-q')?.addEventListener('input', e => { this.q = e.target.value; this.refreshList(); });
    const f = $('[data-form="task-add"]'); f?.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.push({ id: nextId('t'), title: v, note: '', due: null, done: false }); this.refreshList(); renderPanel(); $('[data-form="task-add"] input').focus(); toast('任务已添加'); });
    main.addEventListener('keydown', e => { const r = e.target.closest?.('[data-task]'); if (r && (e.key === 'Enter' || e.key === ' ') && e.target === r) { e.preventDefault(); this.select(r.dataset.task); } });
    main.onclick = e => { const r = e.target.closest('[data-task]'); if (!r || e.target.closest('button,input,.check')) { if (r && e.target.closest('.mcal-task')) this.select(r.dataset.task); return; } this.select(r.dataset.task); };
    if (S.state === 'failed' && !this._toasted) { this._toasted = true; }
  },
  mountDetail() {
    const t = DATA.tasks.find(x => x.id === this.selected); if (!t) return;
    bindTaskChecks($('#detail'));
    const saved = () => { const s = $('#task-save'); if (s) { s.textContent = '正在保存…'; clearTimeout(this._sv); this._sv = setTimeout(() => { s.textContent = '已保存'; }, 450); } };
    $('#td-title').addEventListener('input', e => { t.title = e.target.value.replace(/\n/g, ' '); saved(); const row = $(`[data-task="${t.id}"] .task-title`); if (row) row.textContent = t.title; });
    $('#td-note').addEventListener('input', e => { t.note = e.target.value; saved(); });
    mountDateFields($('#detail'), (id, v) => { if (id === 'td-due') t.due = v; if (id === 'td-remind') t.remind = v; if (id === 'td-plan') t.planDate = v; saved(); this.refreshList(); });
  },
  refreshList() { const b = $('#task-body'); if (b) { const sc = $('#task-scroll').scrollTop; const fid = b.contains(document.activeElement) ? document.activeElement.closest('[data-task]')?.dataset.task : null; b.innerHTML = this.bodyHTML(); bindTaskChecks(b); const f = $('[data-form="task-add"]'); if (f) f.onsubmit = null; $('#task-scroll').scrollTop = sc; this.rebindAdd(); if (fid) $(`#task-body [data-task="${fid}"]`)?.focus(); } },
  rebindAdd() { const f = $('[data-form="task-add"]'); if (!f || f.__b) return; f.__b = 1; f.addEventListener('submit', e => { e.preventDefault(); const v = f.title.value.trim(); if (!v) return; DATA.tasks.push({ id: nextId('t'), title: v, note: '', due: null, done: false }); this.refreshList(); renderPanel(); $('[data-form="task-add"] input').focus(); toast('任务已添加'); }); },
  select(id) { this.selected = id; if (S.page === 'tasks') { $$('[data-task]').forEach(r => r.setAttribute('aria-selected', r.dataset.task === id)); renderDetail(); $('#td-title')?.focus(); } },
  closeDetail() { const id = this.selected; this.selected = null; renderDetail(); $(`[data-task="${id}"]`)?.focus(); },
  toggle(id, checked) {
    const t = DATA.tasks.find(x => x.id === id); if (!t || this.pending.has(id)) return;
    this.pending.add(id); this.repaint();
    setTimeout(() => {
      this.pending.delete(id);
      if (this.failNext) { this.failNext = false; toast(`没能${checked ? '完成' : '重新打开'}“${t.title}”，已恢复原状态`, { kind: 'error', action: '重试', onAction: () => this.toggle(id, checked) }); this.repaint(); return; }
      t.done = checked; t.doneAt = checked ? ymd(TODAY) : null;
      if (checked && this.status === 'open') { this.leaving.add(id); setTimeout(() => { this.leaving.delete(id); this.repaint(); }, 1400); }
      this.repaint(); renderPanel();
      if (checked) toast(t.repeat ? `已完成，下一次：${t.repeat}` : '已完成', { action: '撤销', onAction: () => { t.done = false; t.doneAt = null; this.repaint(); renderPanel(); } });
    }, 650);
  },
  repaint() { if (S.page === 'tasks') { this.refreshList(); if (this.selected) { renderDetail(); } } else if (S.page === 'home') renderMain(); },
  newTask() {
    let draft = { title: '', due: ymd(TODAY), planDate: null }, dirty = false;
    openLayer({ kind: 'dialog', label: '新建任务', guard: () => { if (!dirty) return true; confirmDialog({ title: '放弃这个任务？', body: '已输入的内容不会保存。', confirm: '放弃', danger: true, onConfirm: () => closeTop(true) }); return false; },
      content: h`<form id="nt-form" novalidate><div class="dialog-head"><div><h2>新建任务</h2><p>添加到“${this.listName()}”</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div>
      <div class="dialog-body"><div class="field"><label class="field-label" for="nt-title">标题<span class="req" aria-hidden="true">*</span></label><input class="input" id="nt-title" autofocus aria-required="true" placeholder="要做什么？"></div>
      <div class="field-grid" style="margin-top:16px"><div class="field"><label class="field-label" for="nt-due">截止日期</label>${dateField({ id: 'nt-due', value: draft.due, label: '截止日期' })}</div>
      <div class="field"><label class="field-label" for="nt-plan">计划日期</label>${dateField({id:'nt-plan',value:'',label:'计划日期'})}</div></div><p class="field-help">时区：Asia/Shanghai。截止日期与计划日期分别保存。</p></div>
      <div class="dialog-foot"><span class="left"><span class="kbd">⌘</span><span class="kbd">↵</span> 保存</span><button type="button" class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" type="submit">创建任务</button></div></form>` });
    const form = $('#nt-form');
    mountDateFields(form, (id, v) => { draft[id === 'nt-plan' ? 'planDate' : 'due'] = v; dirty = true; });
    form.addEventListener('input', () => { dirty = true; });
    form.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) form.requestSubmit(); });
    form.addEventListener('submit', e => {
      e.preventDefault(); const title = $('#nt-title').value.trim();
      if (!title) { const i = $('#nt-title'); i.setAttribute('aria-invalid', 'true'); if (!$('#nt-title-err')) i.insertAdjacentHTML('afterend', html(h`<div class="field-error" id="nt-title-err">${icon('circle-alert')}<span>请填写任务标题</span></div>`)); i.setAttribute('aria-describedby', 'nt-title-err'); i.focus(); return; }
      if ($('#nt-due').getAttribute('aria-invalid') === 'true') { $('#nt-due').focus(); return; }
      const t = { id: nextId('t'), title, note: '', due: draft.due, planDate: draft.planDate, timezone: 'Asia/Shanghai', done: false };
      DATA.tasks.push(t); closeTop(true); this.selected = t.id; if (S.page === 'tasks') { this.refreshList(); renderPanel(); renderDetail(); } toast('任务已创建');
    });
  },
  actions: {
    'task-list': el => { const P = PAGES.tasks; P.list = el.dataset.id; P.selected = null; S.state = el.dataset.id === 'p-empty' ? 'empty' : 'default'; if (el.dataset.id === 'done') P.status = 'done'; else if (P.status === 'done') P.status = 'open'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'task-view': el => { PAGES.tasks.view = el.dataset.v; renderMain(); },
    'task-status': el => { PAGES.tasks.status = el.dataset.v; $$('[data-action="task-status"]').forEach(b => b.setAttribute('aria-checked', b === el)); PAGES.tasks.refreshList(); },
    'new-task': () => PAGES.tasks.newTask(),
    'close-detail': () => PAGES.tasks.closeDetail(),
    'task-clear': () => { Object.assign(PAGES.tasks, { q: '', range: { from: null, to: null }, status: 'all', list: 'all' }); S.state = 'default'; renderPanel(); renderMain(); },
    'task-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); }, 600); },
    'task-fail-off': () => { PAGES.tasks.failNext = false; S.state = 'default'; renderMain(); },
    daterange: el => openDateRange(el, PAGES.tasks.range, r => { PAGES.tasks.range = r; renderMain(); $('#task-range')?.focus(); }),
    'daterange-clear': () => { PAGES.tasks.range = { from: null, to: null }; renderMain(); $('#task-range')?.focus(); },
    'task-sort': el => menu(el, [{ id: 'due', label: '按截止日期', icon: 'calendar' }, { id: 'created', label: '按创建时间', icon: 'clock' }], '排序'),
    'task-reopen': el => PAGES.tasks.toggle(el.dataset.id, false),
    'task-menu': el => { const t = DATA.tasks.find(x => x.id === el.dataset.id); menu(el, [{ id: 'open', label: '打开详情', icon: 'panel-right', run: () => PAGES.tasks.select(t.id) }, { id: 'today', label: '改到今天', icon: 'sun', run: () => { t.due = ymd(TODAY); PAGES.tasks.repaint(); toast('已改到今天'); } }, { id: 'copy', label: '复制链接', icon: 'link', run: () => toast('已复制任务链接（原型模拟）', { kind: 'info' }) }, '-', { id: 'del', label: '删除', icon: 'trash-2', danger: true, run: () => PAGES.tasks.actions['task-delete'](el) }]); },
    'task-delete': el => { const t = DATA.tasks.find(x => x.id === el.dataset.id); confirmDialog({ title: '删除这个任务？', body: `“${t.title}”将被删除。确认后由任务服务执行，失败时保留当前任务。`, confirm: '删除', danger: true, onConfirm: () => { const i = DATA.tasks.indexOf(t); DATA.tasks.splice(i, 1); PAGES.tasks.selected = null; PAGES.tasks.refreshList(); renderDetail(); renderPanel(); toast('任务已删除（原型模拟）'); } }); },
  },
};

/* ==========================================================================
   档案 · type → record tree, record editor, belongings, person reading, studio
   ========================================================================== */
const mark = (text, q) => { if (!q) return esc(text); const i = text.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); };
PAGES.archives = {
  title: '档案', states: ['default', 'record', 'belongings', 'person', 'studio', 'search', 'no-results', 'dirty', 'loading', 'error', 'empty'],
  sel: { kind: 'type', id: 'book' }, expanded: new Set(['book']), q: '', focusId: null, layout: 'table', dirty: false, itemFilter: 'all',
  enter(s) { this.applyState(s); },
  applyState(s) {
    this.q = ''; this.dirty = false; this.expanded = new Set(['book']); this.sel = { kind: 'type', id: 'book' }; this.itemFilter = 'all';
    if (s === 'record' || s === 'dirty') { this.sel = { kind: 'record', id: 'r-b1' }; this.dirty = s === 'dirty'; }
    if (s === 'belongings') { this.sel = { kind: 'type', id: 'item' }; this.expanded.add('item'); }
    if (s === 'person') { this.sel = { kind: 'record', id: 'r-p1' }; this.expanded.add('person'); }
    if (s === 'studio') this.sel = { kind: 'studio', id: 'studio' };
    if (s === 'search') this.q = '设计';
    if (s === 'no-results') this.q = '不存在的档案';
    if (s === 'empty') this.sel = { kind: 'type', id: 'project-empty' };
  },
  openRecord(id) { const r = DATA.records.find(x => x.id === id); if (!r) return; this.sel = { kind: 'record', id }; this.expanded.add(r.type); this.dirty = false; S.state = r.type === 'person' ? 'person' : 'record'; renderPanel(); renderMain(); },
  nodes() {
    const q = this.q.trim().toLowerCase(), out = [];
    out.push({ group: '类型' });
    for (const t of DATA.types) {
      const recs = DATA.records.filter(r => r.type === t.id); const hits = q ? recs.filter(r => r.title.toLowerCase().includes(q)) : recs;
      const typeHit = q && t.name.toLowerCase().includes(q);
      if (q && !hits.length && !typeHit) continue;
      const open = q ? true : this.expanded.has(t.id);
      out.push({ id: t.id, kind: 'type', label: t.name, icon: t.icon, lvl: 0, count: recs.length, open, parent: null, hasKids: true });
      if (open) (q ? hits : recs).forEach(r => out.push({ id: r.id, kind: 'record', label: r.title, icon: 'file-text', lvl: 1, parent: t.id }));
    }
    if (!q) {
      out.push({ group: '视图' });
      DATA.views.forEach(v => out.push({ id: v.id, kind: 'view', label: v.name, icon: 'bookmark', lvl: 0 }));
      out.push({ group: '管理' });
      out.push({ id: 'studio', kind: 'studio', label: '类型设计器', icon: 'shapes', lvl: 0 });
      out.push({ id: 'report', kind: 'report', label: '归物年度报告', icon: 'chart-column', lvl: 0 });
      out.push({ id: 'recovery', kind: 'recovery', label: '恢复中心', icon: 'undo-2', lvl: 0 });
    }
    return out;
  },
  isSel(n) { return this.sel.kind === n.kind && this.sel.id === n.id; },
  panel() {
    return h`<div class="panel-head"><h2>档案</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="arch-new" aria-label="新建记录">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" id="arch-q" placeholder="搜索类型与记录" value="${this.q}" aria-label="搜索档案目录" aria-controls="arch-tree"></div></div>
    <div class="panel-body hu-scroll" id="arch-tree-wrap">${raw(this.treeHTML())}</div>`;
  },
  treeHTML() {
    const nodes = this.nodes(); const items = nodes.filter(n => !n.group);
    if (!items.length) return html(h`<div class="empty" style="min-height:160px;padding:24px 16px"><p>没有匹配“${this.q}”的类型或记录</p><button class="btn btn-secondary btn-sm" data-action="arch-clear-q">清除搜索</button></div>`);
    if (!this.focusId || !items.some(n => n.id === this.focusId)) this.focusId = (items.find(n => this.isSel(n)) || items[0]).id;
    return html(h`<div class="tree" role="tree" id="arch-tree" aria-label="档案目录">${nodes.map(n => n.group ? h`<div class="tree-group" role="presentation">${n.group}</div>` : h`<div class="tree-row" role="treeitem" id="tn-${n.id}" data-node="${n.id}" data-kind="${n.kind}" aria-level="${n.lvl + 1}" ${n.hasKids ? raw(`aria-expanded="${n.open}"`) : ''} aria-selected="${this.isSel(n)}" tabindex="${this.focusId === n.id ? 0 : -1}" style="--lvl:${n.lvl}">
      ${n.hasKids ? h`<span class="tree-twist" data-twist="${n.id}" aria-hidden="true">${icon('chevron-right')}</span>` : raw(`<span class="tree-twist leaf"></span>`)}${icon(n.icon)}<span class="tree-label">${raw(mark(n.label, this.q.trim()))}</span>${n.count != null ? h`<span class="tree-count">${n.count}</span>` : ''}</div>`)}
      ${this.q ? '' : raw('<p class="tree-more" style="--lvl:0">已加载全部 12 条 · 每类型按需分页</p>')}</div>`);
  },
  refreshTree() { const w = $('#arch-tree-wrap'); if (w) { w.innerHTML = this.treeHTML(); } },
  mountPanel() {
    const q = $('#arch-q'); q?.addEventListener('input', e => { this.q = e.target.value; this.refreshTree(); });
    q?.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { $('#arch-tree [tabindex="0"]')?.focus(); e.preventDefault(); } });
    const wrap = $('#arch-tree-wrap');
    wrap.addEventListener('click', e => {
      const tw = e.target.closest('[data-twist]'); const row = e.target.closest('[data-node]');
      if (tw) { e.stopPropagation(); this.toggleExpand(tw.dataset.twist); return; }
      if (row) this.activate(row.dataset.node, row.dataset.kind);
    });
    wrap.addEventListener('keydown', e => {
      const row = e.target.closest('[data-node]'); if (!row) return;
      const rows = $$('[data-node]', wrap); const i = rows.indexOf(row); const n = this.nodes().filter(x => !x.group).find(x => x.id === row.dataset.node);
      const focus = r => { if (!r) return; this.focusId = r.dataset.node; rows.forEach(x => x.tabIndex = -1); r.tabIndex = 0; r.focus(); };
      if (e.key === 'ArrowDown') { focus(rows[i + 1]); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { if (i === 0) $('#arch-q')?.focus(); else focus(rows[i - 1]); e.preventDefault(); }
      else if (e.key === 'Home') { focus(rows[0]); e.preventDefault(); }
      else if (e.key === 'End') { focus(rows[rows.length - 1]); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { if (n.hasKids && !n.open) this.toggleExpand(n.id, true); else if (n.hasKids) focus(rows[i + 1]); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { if (n.hasKids && n.open) this.toggleExpand(n.id, true); else if (n.parent) focus($(`[data-node="${n.parent}"]`, wrap)); e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { this.activate(n.id, n.kind); e.preventDefault(); }
      else if (e.key.length === 1 && /\S/.test(e.key)) { const next = rows.slice(i + 1).concat(rows.slice(0, i)).find(r => r.textContent.trim().startsWith(e.key)); focus(next); }
    });
  },
  toggleExpand(id, keepFocus) {
    if (this.q) return; // search expansion is derived, never written back
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
    this.focusId = id; this.refreshTree(); if (keepFocus !== false) $(`#tn-${CSS.escape(id)}`)?.focus();
  },
  activate(id, kind) {
    const go2 = () => {
      this.focusId = id; this.dirty = false;
      if (kind === 'type') { this.sel = { kind, id }; this.expanded.add(id); S.state = id === 'item' ? 'belongings' : 'default'; }
      else if (kind === 'record') { this.sel = { kind, id }; const r = DATA.records.find(x => x.id === id); S.state = r.type === 'person' ? 'person' : 'record'; }
      else if (kind === 'view') { const v = DATA.views.find(x => x.id === id); this.sel = { kind: 'view', id }; S.state = 'default'; this.viewType = v.type; }
      else { this.sel = { kind, id }; S.state = kind === 'studio' ? 'studio' : 'default'; }
      S.panelSheet = false; renderPanel(); renderMain(); $(`#tn-${CSS.escape(id)}`)?.focus();
    };
    if (this.dirty) confirmDialog({ title: '放弃未保存的修改？', body: '这条记录有尚未保存的修改，离开后会丢失。', confirm: '放弃修改', danger: true, onConfirm: go2 }); else go2();
  },
  main() {
    const st = S.state;
    if (st === 'loading') return h`${pageHead('档案', { sub: '正在读取档案索引…' })}<div class="page-body" aria-busy="true"><div class="page-pad"><p class="sr-only" role="status">正在读取档案索引</p>${[1, 2, 3, 4, 5, 6].map(() => raw('<span class="skel skel-row"></span>'))}</div></div>`;
    if (st === 'error') return h`${pageHead('档案')}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">档案索引读取失败</p><p>索引文件损坏或被占用。原始记录文件没有被修改，可以重建索引。</p></div><button class="btn btn-secondary btn-sm" data-action="arch-retry">${icon('refresh-cw', 'ico-sm')}重建索引</button></div></div></div>`;
    const s = this.sel;
    if (s.kind === 'record') { const r = DATA.records.find(x => x.id === s.id); return r.type === 'person' ? this.personView(r) : this.recordView(r); }
    if (s.kind === 'studio') return this.studioView();
    if (s.kind === 'recovery') return h`${pageHead('恢复中心', { crumb: h`<span>档案</span>${icon('chevron-right', 'ico-sm')}` })}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="empty"><span class="empty-mark">${icon('undo-2', 'ico-lg')}</span><h2>没有需要恢复的修订</h2><p>删除或被覆盖的记录会在这里保留 30 天，可按修订恢复。</p></div></div></div>`;
    if (s.kind === 'report') return this.reportView();
    if (s.id === 'project-empty') return h`${pageHead('读书会')}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('library', 'ico-lg')}</span><h2>“读书会”类型还没有记录</h2><p>记录会以 Markdown 文件保存在 huhu/档案/读书会/。</p><div class="row"><button class="btn btn-primary" data-action="arch-new">${icon('plus')}新建记录</button><button class="btn btn-secondary" data-action="arch-studio">编辑字段</button></div></div></div>`;
    const typeId = s.kind === 'view' ? this.viewType : s.id;
    if (typeId === 'item') return this.belongingsView();
    return this.typeView(DATA.typeOf(typeId), s.kind === 'view' ? DATA.views.find(v => v.id === s.id).name : null);
  },
  typeView(t, viewName) {
    const recs = DATA.records.filter(r => r.type === t.id).filter(r => !viewName || r.fields.状态 === '在读');
    const cols = Object.keys(recs[0]?.fields || {}).slice(0, 4);
    const cell = v => Array.isArray(v) ? v.join('、') : typeof v === 'number' ? '★'.repeat(v) + '☆'.repeat(5 - v) : (v || '—');
    return h`${pageHead(viewName || t.name, { sub: `${recs.length} 条记录`, crumb: viewName ? h`<span>视图</span>${icon('chevron-right', 'ico-sm')}` : '', actions: h`<div class="seg" role="radiogroup" aria-label="布局"><button role="radio" aria-checked="${this.layout === 'table'}" data-action="arch-layout" data-v="table" aria-label="表格">${icon('list', 'ico-sm')}</button><button role="radio" aria-checked="${this.layout === 'cards'}" data-action="arch-layout" data-v="cards" aria-label="卡片">${icon('layout-grid', 'ico-sm')}</button></div><button class="btn btn-primary" data-action="arch-new">${icon('plus')}<span class="hide-sm">新建记录</span></button>` })}
    <div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="在${t.name}中筛选" aria-label="筛选记录"></div><button class="btn btn-ghost">${icon('list-filter', 'ico-sm')}筛选</button><button class="btn btn-ghost">${icon('arrow-up-down', 'ico-sm')}最近修改</button></div>
    <div class="page-body hu-scroll"><div class="page-pad" style="padding-top:4px">${this.layout === 'table'
      ? h`<div class="table-wrap"><table class="table"><thead><tr><th>名称</th>${cols.map(c => h`<th>${c}</th>`)}<th class="num">修改</th></tr></thead><tbody>${recs.map(r => h`<tr data-action="arch-open" data-id="${r.id}" tabindex="0"><td class="primary"><span class="row">${icon(t.icon, 'ico-sm')}${r.title}</span></td>${cols.map(c => h`<td>${cell(r.fields[c])}</td>`)}<td class="num muted">${relDay(r.updated)}</td></tr>`)}</tbody></table></div>`
      : h`<div class="rec-cards">${recs.map(r => h`<button class="card card-interactive rec-card" data-action="arch-open" data-id="${r.id}"><span class="rec-card-icon" style="--c:${t.color}">${icon(t.icon)}</span><strong>${r.title}</strong><span class="muted">${cols.slice(0, 2).map(c => cell(r.fields[c])).join(' · ')}</span></button>`)}</div>`}</div></div>`;
  },
  recordView(r) {
    const t = DATA.typeOf(r.type);
    const field = (k, v) => {
      const id = 'f-' + k;
      if (/生日|购入|开始|保修至|退出/.test(k)) return h`<div class="field"><label class="field-label" for="${id}">${k}</label>${dateField({ id, value: v || '', label: k })}</div>`;
      if (k === '状态') return h`<div class="field"><label class="field-label" for="${id}">${k}</label><select class="select" id="${id}">${['想读', '在读', '已读', '使用中', '闲置', '已转卖'].filter(x => (r.type === 'book') === ['想读', '在读', '已读'].includes(x)).map(x => h`<option ${x === v ? raw('selected') : ''}>${x}</option>`)}</select></div>`;
      if (k === '评分') return h`<div class="field"><span class="field-label" id="${id}-l">${k}</span><div class="stars" role="radiogroup" aria-labelledby="${id}-l">${[1, 2, 3, 4, 5].map(n => h`<button role="radio" aria-checked="${n === v}" aria-label="${n} 星" class="${n <= v ? 'on' : ''}" data-action="arch-star" data-n="${n}">${icon('star')}</button>`)}</div></div>`;
      if (Array.isArray(v)) return h`<div class="field"><span class="field-label">${k}</span><div class="row" style="flex-wrap:wrap;gap:6px;min-height:32px">${v.map(x => h`<span class="badge">${x}</span>`)}<button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}添加</button></div></div>`;
      return h`<div class="field"><label class="field-label" for="${id}">${k}</label><input class="input ${/价格|回收/.test(k) ? 'num' : ''}" id="${id}" value="${v}"></div>`;
    };
    return h`${pageHead(r.title, { crumb: h`<button data-action="arch-type" data-id="${t.id}">${t.name}</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<span class="save-state" id="rec-save">${this.dirty ? '有未保存的修改' : '已保存 · ' + relDay(r.updated)}</span><button class="btn btn-ghost btn-icon" data-action="arch-rec-menu" aria-label="更多操作">${icon('ellipsis')}</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad record">
      <header class="record-head"><span class="rec-icon" style="--c:${t.color}">${icon(t.icon, 'ico-lg')}</span><div class="grow"><h2 class="record-title">${r.title}</h2><p class="muted">${t.name} · huhu/档案/${t.name}/${r.title}.md</p></div></header>
      <div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true">字段</button><button class="tab" role="tab" aria-selected="false">关联 <span class="count">2</span></button><button class="tab" role="tab" aria-selected="false">修订 <span class="count">12</span></button></div>
      <form class="record-form" id="rec-form"><div class="field-grid">${Object.entries(r.fields).map(([k, v]) => field(k, v))}<div class="field span-2"><label class="field-label" for="f-note">笔记</label><textarea class="textarea" id="f-note" placeholder="写点什么…">${r.type === 'book' ? '第 4 章“信息的建筑”：设计是把信息整理成可感知的形式。' : ''}</textarea></div></div></form>
      <section class="relations"><div class="section-title">关联 <span class="muted">2</span></div><div class="rel-grid"><button class="link-card" data-action="go" data-page="tasks">${icon('list-checks')}<span class="grow truncate">读完《设计中的设计》第 4 章</span><span class="badge">任务</span></button><button class="link-card" data-action="arch-open" data-id="r-p1">${icon('user')}<span class="grow truncate">林知微</span><span class="badge">人物 · 推荐人</span></button></div></section>
    </div></div>
    ${this.dirty ? h`<div class="dirty-bar" role="region" aria-label="未保存的修改"><span>${icon('circle-dot', 'ico-sm')}有 1 处未保存的修改</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="arch-discard">放弃</button><button class="btn btn-primary btn-sm" data-action="arch-save">保存<span class="kbd">⌘S</span></button></div>` : ''}`;
  },
  personView(r) {
    const j = DATA.journal.filter(x => x.person === r.id);
    return h`${pageHead(r.title, { crumb: h`<button data-action="arch-type" data-id="person">人物</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<button class="btn btn-secondary" data-action="arch-edit-person">${icon('pencil', 'ico-sm')}编辑资料</button><button class="btn btn-primary" data-action="journal-add">${icon('plus')}写纪事</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow person">
      <section class="person-hero"><span class="avatar avatar-lg">${r.title.slice(0, 1)}</span><div><h2 class="reading-title">${r.title}</h2><p class="fg2">${r.fields.关系} · ${r.fields.城市}</p><div class="row" style="margin-top:8px;flex-wrap:wrap">${r.fields.标签.map(x => h`<span class="badge">${x}</span>`)}</div></div></section>
      <div class="person-grid"><dl class="card card-body props"><div class="prop"><dt>生日</dt><dd>${r.fields.生日 ? fmtLong(r.fields.生日).split(' ')[0] : '—'}</dd></div><div class="prop"><dt>认识</dt><dd>2012 年 · 14 年</dd></div><div class="prop"><dt>上次联系</dt><dd>${relDay('2026-11-01')}</dd></div><div class="prop"><dt>同名</dt><dd class="muted">无（按稳定 ID r-p1 识别）</dd></div></dl>
      <section><div class="section-title">纪事 <span class="muted">${j.length}</span></div><ol class="timeline" id="journal">${j.map(x => h`<li class="tl-item"><span class="tl-dot"></span><div><p class="tl-date num">${fmtLong(x.date)}</p><h3>${x.title}</h3><p class="reading">${x.body}</p></div></li>`)}</ol></section></div>
    </div></div>`;
  },
  belongingsView() {
    const items = DATA.records.filter(r => r.type === 'item'); const f = this.itemFilter;
    const shown = items.filter(r => f === 'all' || r.fields.状态 === f);
    const badge = s => ({ 使用中: 'badge-success', 闲置: 'badge-warning', 已转卖: 'badge-info' }[s] || '');
    return h`${pageHead('归物', { sub: `${items.length} 件物品`, actions: h`<button class="btn btn-ghost" data-action="arch-report">${icon('chart-column', 'ico-sm')}年度报告</button><button class="btn btn-primary" data-action="arch-new">${icon('plus')}<span class="hide-sm">登记物品</span></button>` })}
    <div class="page-body hu-scroll"><div class="page-pad">
      <div class="kpis"><div class="kpi"><span class="kpi-label">在用</span><span class="kpi-value num">2</span></div><div class="kpi"><span class="kpi-label">闲置</span><span class="kpi-value num">1</span></div><div class="kpi"><span class="kpi-label">累计投入</span><span class="kpi-value num">¥6,697</span><span class="kpi-sub">CNY · 4 件</span></div><div class="kpi"><span class="kpi-label">日均成本</span><span class="kpi-value num">¥4.21</span><span class="kpi-sub">按持有天数</span></div></div>
      <div class="row" style="margin:20px 0 12px"><div class="seg" role="radiogroup" aria-label="状态">${['all', '使用中', '闲置', '已转卖'].map(x => h`<button role="radio" aria-checked="${f === x}" data-action="arch-item-filter" data-v="${x}">${x === 'all' ? '全部' : x}</button>`)}</div></div>
      <div class="item-grid">${shown.map(r => h`<button class="card card-interactive item-card" data-action="arch-open" data-id="${r.id}"><div class="item-thumb">${icon('package', 'ico-xl')}</div><div class="item-info"><div class="row"><strong class="truncate grow">${r.title}</strong><span class="badge ${badge(r.fields.状态)}">${r.fields.状态}</span></div><p class="muted num">${r.fields.价格} · ${r.fields.购入 ? '购于 ' + r.fields.购入 : ''}</p>${r.fields.位置 ? h`<p class="muted">${icon('map-pin', 'ico-sm')} ${r.fields.位置}</p>` : ''}</div></button>`)}</div>
    </div></div>`;
  },
  reportView() {
    const months = [1, 0, 2, 0, 1, 1, 0, 1, 0, 0, 1, 0];
    return h`${pageHead('归物年度报告', { crumb: h`<span>归物</span>${icon('chevron-right', 'ico-sm')}`, actions: h`<select class="select" style="width:auto" aria-label="年份"><option>2026</option><option>2025</option></select>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="kpis"><div class="kpi"><span class="kpi-label">新增</span><span class="kpi-value num">3</span></div><div class="kpi"><span class="kpi-label">支出</span><span class="kpi-value num">¥3,897</span></div><div class="kpi"><span class="kpi-label">转卖回收</span><span class="kpi-value num">¥3,100</span></div><div class="kpi"><span class="kpi-label">净成本</span><span class="kpi-value num">¥797</span></div></div>
    <section class="card" style="margin-top:20px"><header class="card-head"><h3 class="card-title">${icon('chart-column')}每月新增</h3></header><div class="card-body"><div class="bars bars-lg">${months.map((v, i) => h`<span style="height:${v ? v * 33 + 8 : 4}%" title="${i + 1}月 ${v} 件"><i>${i + 1}</i></span>`)}</div></div></section></div></div>`;
  },
  studioView() {
    const fields = [['名称', 'text', '必填'], ['作者', 'text', ''], ['状态', 'select', '想读 / 在读 / 已读'], ['评分', 'rating', '0–5'], ['开始', 'date', '日精度'], ['推荐人', 'relation', '→ 人物']];
    const ti = { text: 'type', select: 'list', rating: 'star', date: 'calendar', relation: 'link' };
    return h`${pageHead('类型设计器', { crumb: h`<span>管理</span>${icon('chevron-right', 'ico-sm')}`, actions: h`<span class="save-state">草稿 · 未发布</span><button class="btn btn-secondary">预览</button><button class="btn btn-primary" data-action="arch-publish">发布修订</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad studio"><div class="studio-list card"><header class="card-head"><h3 class="card-title">${icon('book')}书籍 · 字段</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}字段</button></header>
      <ul>${fields.map(([n, t, d], i) => h`<li class="studio-field ${i === 2 ? 'is-active' : ''}"><span class="grip" aria-hidden="true">${icon('grip-vertical', 'ico-sm')}</span>${icon(ti[t])}<span class="grow">${n}</span><span class="muted">${d}</span></li>`)}</ul></div>
      <div class="card card-body"><div class="section-title">字段 · 状态</div><div class="field"><label class="field-label" for="sf-name">名称</label><input class="input" id="sf-name" value="状态"></div><div class="field"><label class="field-label" for="sf-type">类型</label><select class="select" id="sf-type"><option>单选</option><option>多选</option></select></div><div class="field"><span class="field-label">选项</span><div class="row" style="flex-wrap:wrap;gap:6px">${['想读', '在读', '已读'].map(x => h`<span class="badge badge-outline">${x}</span>`)}<button class="btn btn-ghost btn-sm">${icon('plus', 'ico-sm')}</button></div></div>
      <div class="notice notice-info" style="margin-top:16px">${icon('info')}<span>发布后生成修订 r13。已有记录不会被改写；新字段的空值按“未填”显示。</span></div></div></div></div>`;
  },
  mount() { mountDateFields($('#main'), () => { this.markDirty(); }); $('#rec-form')?.addEventListener('input', () => this.markDirty()); },
  markDirty() {
    if (this.dirty) return; this.dirty = true; S.state = 'dirty'; $('#main').dataset.state = 'dirty';
    const s = $('#rec-save'); if (s) s.textContent = '有未保存的修改';
    if (!$('.dirty-bar')) $('#main').insertAdjacentHTML('beforeend', html(h`<div class="dirty-bar" role="region" aria-label="未保存的修改"><span>${icon('circle-dot', 'ico-sm')}有未保存的修改</span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="arch-discard">放弃</button><button class="btn btn-primary btn-sm" data-action="arch-save">保存<span class="kbd">⌘S</span></button></div>`));
  },
  actions: {
    'arch-open': el => PAGES.archives.activate(el.dataset.id, 'record'),
    'arch-type': el => PAGES.archives.activate(el.dataset.id, 'type'),
    'arch-clear-q': () => { PAGES.archives.q = ''; $('#arch-q').value = ''; PAGES.archives.refreshTree(); $('#arch-q').focus(); },
    'arch-layout': el => { PAGES.archives.layout = el.dataset.v; renderMain(); },
    'arch-item-filter': el => { PAGES.archives.itemFilter = el.dataset.v; renderMain(); },
    'arch-report': () => PAGES.archives.activate('report', 'report'),
    'arch-studio': () => PAGES.archives.activate('studio', 'studio'),
    'arch-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); toast('索引已重建，共 12 条记录'); }, 700); },
    'arch-save': () => { PAGES.archives.dirty = false; S.state = 'record'; renderMain(); toast('记录已保存，生成修订 r13'); },
    'arch-discard': () => confirmDialog({ title: '放弃修改？', body: '恢复到上次保存的内容。', confirm: '放弃修改', danger: true, onConfirm: () => { PAGES.archives.dirty = false; S.state = 'record'; renderMain(); } }),
    'arch-star': () => PAGES.archives.markDirty(),
    'arch-publish': () => confirmDialog({ title: '发布“书籍”修订 r13？', body: '会新增 1 个字段并调整排序，已有 38 条记录保持原文件不变。', confirm: '发布', onConfirm: () => toast('已发布修订 r13') }),
    'arch-new': () => openLayer({ kind: 'dialog', label: '新建记录', content: h`<div class="dialog-head"><div><h2>新建记录</h2><p>选择类型后填写名称，其余字段可稍后补充。</p></div><button class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div><div class="dialog-body"><div class="type-pick">${DATA.types.map((t, i) => h`<label class="type-opt"><input type="radio" name="nt" ${i === 2 ? raw('checked') : ''}><span class="rec-icon" style="--c:${t.color}">${icon(t.icon)}</span>${t.name}</label>`)}</div><div class="field" style="margin-top:16px"><label class="field-label" for="nr-title">名称</label><input class="input" id="nr-title" autofocus placeholder="例如：设计中的设计"></div></div><div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="layer-close">创建</button></div>` }),
    'arch-rec-menu': el => menu(el, [{ id: 'open', label: '在笔记中打开', icon: 'external-link' }, { id: 'hist', label: '查看修订', icon: 'history' }, { id: 'dup', label: '复制为新记录', icon: 'copy' }, '-', { id: 'del', label: '删除记录', icon: 'trash-2', danger: true, run: () => confirmDialog({ title: '删除这条记录？', body: '文件会移到恢复中心，30 天内可恢复。', confirm: '删除', danger: true, onConfirm: () => { PAGES.archives.activate('book', 'type'); toast('已删除，可在恢复中心找回', { action: '撤销' }); } }) }]),
    'arch-edit-person': () => PAGES.archives.activate('r-p1', 'record'),
    'journal-add': () => openLayer({ kind: 'dialog', label: '写纪事', content: h`<div class="dialog-head"><div><h2>写纪事</h2><p>林知微</p></div></div><div class="dialog-body"><div class="field"><label class="field-label" for="jn-date">日期</label>${dateField({ id: 'jn-date', value: ymd(TODAY), label: '日期' })}</div><div class="field"><label class="field-label" for="jn-title">标题</label><input class="input" id="jn-title" autofocus></div><div class="field"><label class="field-label" for="jn-body">内容</label><textarea class="textarea" id="jn-body"></textarea></div></div><div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="journal-save">保存</button></div>` }) && mountDateFields($('.dialog')),
    'journal-save': () => { const t = $('#jn-title').value.trim() || '无标题纪事'; DATA.journal.unshift({ id: nextId('j'), person: 'r-p1', date: $('#jn-date').value || ymd(TODAY), title: t, body: $('#jn-body').value }); closeTop(true); renderMain(); toast('纪事已保存'); },
  },
};

/* ==========================================================================
   自动化 · list stays mounted; inspector on the right; Switch toggles
   ========================================================================== */
const kindIcon = { agent: 'bot', script: 'square-terminal', sync: 'refresh-cw', notify: 'bell' };
const runBadge = s => ({ success: h`<span class="badge badge-success">${icon('circle-check')}成功</span>`, failed: h`<span class="badge badge-danger">${icon('circle-x')}失败</span>`, running: h`<span class="badge badge-warning"><span class="spinner" style="width:10px;height:10px;border-width:1.5px"></span>运行中</span>` }[s] || '');
PAGES.automations = {
  title: '自动化', states: ['default', 'detail', 'detail-runs', 'run-detail', 'editing', 'toggle-pending', 'toggle-failed', 'all-runs', 'new', 'empty', 'missing', 'loading', 'error'],
  filter: 'all', q: '', insp: null, pending: new Set(), failNext: false, mode: 'list',
  enter(s) { this.applyState(s); },
  applyState(s) {
    Object.assign(this, { filter: 'all', q: '', insp: null, failNext: false, mode: 'list' }); this.pending = new Set();
    if (['detail', 'editing', 'toggle-pending'].includes(s)) this.insp = { kind: 'definition', id: 'a1', tab: 'overview' };
    if (s === 'detail-runs') this.insp = { kind: 'definition', id: 'a1', tab: 'runs' };
    if (s === 'run-detail') this.insp = { kind: 'run', id: 'run-3', back: 'a1' };
    if (s === 'toggle-pending') this.pending.add('a1');
    if (s === 'toggle-failed') { this.failNext = true; this.insp = { kind: 'definition', id: 'a3', tab: 'overview' }; }
    if (s === 'all-runs') this.mode = 'runs';
    if (s === 'new') this.mode = 'new';
    if (s === 'missing') this.insp = { kind: 'definition', id: 'a-404', tab: 'overview' };
  },
  mount() { if (S.state === 'editing' && !this._editOpen) { this._editOpen = true; setTimeout(() => { this.openEdit('a1'); this._editOpen = false; }, 0); } this.bindList(); mountDateFields($('#main')); },
  visible() { const q = this.q.trim().toLowerCase(); return (S.state === 'empty' ? [] : DATA.automations).filter(a => this.filter === 'all' || (this.filter === 'on' ? a.enabled : !a.enabled)).filter(a => !q || a.name.toLowerCase().includes(q)); },
  main() {
    const st = S.state;
    if (this.mode === 'new') return this.newPage();
    if (this.mode === 'runs') return this.allRuns();
    const on = DATA.automations.filter(a => a.enabled).length, off = DATA.automations.length - on;
    const head = pageHead('自动化', { sub: st === 'empty' ? '' : `${on} 个启用 · ${off} 个停用`, actions: h`<button class="btn btn-ghost" data-action="auto-all-runs">${icon('history', 'ico-sm')}<span class="hide-sm">全部运行记录</span></button><button class="btn btn-primary" data-action="auto-new">${icon('plus')}<span class="hide-sm">新建自动化</span></button>` });
    if (st === 'loading') return h`${head}<div class="page-body" aria-busy="true"><div class="page-pad"><p class="loading-note" role="status"><span class="spinner"></span>正在读取自动化定义…</p>${[1, 2, 3, 4].map(() => raw('<span class="skel skel-row" style="height:56px"></span>'))}</div></div>`;
    if (st === 'error') return h`${head}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">调度服务没有响应</p><p>无法读取自动化定义。已有的计划不会因此停止。</p></div><button class="btn btn-secondary btn-sm" data-action="auto-retry">${icon('refresh-cw', 'ico-sm')}重试</button></div></div></div>`;
    if (st === 'empty') return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('workflow', 'ico-lg')}</span><h2>还没有自动化</h2><p>按时间或事件运行智能体、脚本与同步任务，结果会进入通知收件箱。</p><div class="row"><button class="btn btn-primary" data-action="auto-new">${icon('plus')}新建自动化</button></div></div></div>`;
    return h`${head}<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" id="auto-q" placeholder="搜索自动化" value="${this.q}" aria-label="搜索自动化"></div>
      <div class="seg" role="radiogroup" aria-label="启用状态">${[['all', '全部', DATA.automations.length], ['on', '启用', on], ['off', '停用', off]].map(([v, l, n]) => h`<button role="radio" aria-checked="${this.filter === v}" data-action="auto-filter" data-v="${v}">${l}<span class="count">${n}</span></button>`)}</div>
      <select class="select" style="width:auto" aria-label="排序"><option>按下次运行</option><option>按名称</option><option>按最近结果</option></select></div>
      ${this.failNext ? h`<div class="page-banner"><div class="notice notice-warning">${icon('triangle-alert')}<span>模拟写入失败已开启：下一次启停会失败并恢复原值。</span></div></div>` : ''}
      <div class="page-body hu-scroll" id="auto-scroll"><div class="auto-list" id="auto-list" role="list">${raw(this.listHTML())}</div></div>`;
  },
  listHTML() {
    const rows = this.visible();
    if (!rows.length) return html(h`<div class="empty"><span class="empty-mark">${icon('text-search', 'ico-lg')}</span><h2>没有匹配的自动化</h2><p>换个关键词，或切换启用状态筛选。</p></div>`);
    return rows.map(a => this.row(a)).join('');
  },
  row(a) {
    const sel = this.insp && (this.insp.id === a.id || this.insp.back === a.id);
    return html(h`<div class="list-row auto-row" role="listitem" data-auto="${a.id}" aria-selected="${!!sel}" tabindex="0">
      <span class="kind-tile kind-${a.kind}">${icon(kindIcon[a.kind])}</span>
      <div class="list-row-main"><span class="list-row-title truncate">${a.name}</span><span class="list-row-meta"><span>${icon('clock', 'ico-sm')} ${a.trigger}</span><span class="sep"></span><span class="auto-last st-${a.last.status}"><span class="dot ${a.last.status === 'success' ? 'dot-success' : a.last.status === 'failed' ? 'dot-danger' : 'dot-working'}"></span>${a.last.status === 'running' ? '运行中' : a.last.at}</span></span></div>
      <div class="list-row-end"><span class="next muted hide-sm num">${a.enabled ? '下次 ' + a.next : '已停用'}</span>${this.switchHTML(a)}</div></div>`);
  },
  switchHTML(a, id = '') {
    const busy = this.pending.has(a.id);
    return h`<span class="switch-row" data-no-row><span class="switch-label" aria-hidden="true">${busy ? '保存中' : a.enabled ? '启用' : '停用'}</span><button class="switch" role="switch" ${id ? raw(`id="${id}"`) : ''} aria-checked="${a.enabled}" aria-label="启用“${a.name}”" data-switch="${a.id}" ${busy ? raw('aria-busy="true" disabled') : ''}></button></span>`;
  },
  bindList() {
    const list = $('#auto-list'); if (!list || list.__b) return; list.__b = 1;
    $('#auto-q')?.addEventListener('input', e => { this.q = e.target.value; this.refresh(); });
    list.addEventListener('click', e => {
      const sw = e.target.closest('[data-switch]'); if (sw) { e.stopPropagation(); this.toggle(sw.dataset.switch); return; }
      if (e.target.closest('[data-no-row]')) return;
      const r = e.target.closest('[data-auto]'); if (r) this.open(r.dataset.auto);
    });
    list.addEventListener('keydown', e => { const r = e.target.closest('[data-auto]'); if (!r || e.target !== r) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.open(r.dataset.auto); } if (e.key === 'ArrowDown') { r.nextElementSibling?.focus(); e.preventDefault(); } if (e.key === 'ArrowUp') { r.previousElementSibling?.focus(); e.preventDefault(); } });
  },
  refresh() { const l = $('#auto-list'); if (l) l.innerHTML = this.listHTML(); },
  syncRow(id) { const old = $(`[data-auto="${id}"]`); const a = DATA.automations.find(x => x.id === id); if (old && a) { const tmp = document.createElement('div'); tmp.innerHTML = this.row(a); const had = old.contains(document.activeElement) ? document.activeElement.dataset.switch : null; old.replaceWith(tmp.firstElementChild); if (had) $(`[data-auto="${id}"] [data-switch]`)?.focus(); } },
  open(id) { this.insp = { kind: 'definition', id, tab: 'overview' }; if (S.state !== 'toggle-failed') S.state = 'detail'; $$('[data-auto]').forEach(r => r.setAttribute('aria-selected', r.dataset.auto === id)); renderDetail(); $('#detail .detail-head h2')?.focus(); },
  closeDetail() { const id = this.insp?.id || this.insp?.back; this.insp = null; S.state = 'default'; $$('[data-auto]').forEach(r => r.setAttribute('aria-selected', 'false')); renderDetail(); $(`[data-auto="${id}"]`)?.focus(); },
  toggle(id) {
    const a = DATA.automations.find(x => x.id === id); if (!a || this.pending.has(id)) return;
    const target = !a.enabled; this.pending.add(id); this.syncRow(id); if (this.insp?.id === id) renderDetail();
    setTimeout(() => {
      this.pending.delete(id);
      if (this.failNext) { this.failNext = false; toast(`没能${target ? '启用' : '停用'}“${a.name}”，已恢复为${a.enabled ? '启用' : '停用'}`, { kind: 'error', action: '重试', onAction: () => this.toggle(id) }); }
      else { a.enabled = target; a.next = target ? (a.next === '已停用' ? '今天 18:00' : a.next) : '已停用'; toast(target ? `已启用“${a.name}”` : `已停用“${a.name}”，进行中的运行不受影响`); }
      this.syncRow(id); if (this.insp?.id === id) renderDetail(); this.refreshHead();
    }, 700);
  },
  refreshHead() { const sub = $('#main .page-head .sub'); if (sub) { const on = DATA.automations.filter(a => a.enabled).length; sub.textContent = `${on} 个启用 · ${DATA.automations.length - on} 个停用`; } $$('[data-action="auto-filter"] .count').forEach((c, i) => { const on = DATA.automations.filter(a => a.enabled).length; c.textContent = [DATA.automations.length, on, DATA.automations.length - on][i]; }); },
  detail() {
    const I = this.insp; if (!I || this.mode !== 'list') return null;
    if (I.kind === 'run') {
      const r = DATA.runs.find(x => x.id === I.id), a = DATA.automations.find(x => x.id === r.auto);
      return h`<header class="detail-head"><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-back" aria-label="返回${a.name}">${icon('arrow-left', 'ico-sm')}</button><h2 class="truncate" tabindex="-1">运行 · ${r.at}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
      <div class="detail-body hu-scroll"><div class="row" style="margin-bottom:12px">${runBadge(r.status)}<span class="muted">${a.name} · 用时 ${r.dur}</span></div>
      ${r.status === 'failed' ? h`<div class="notice notice-error" style="margin-bottom:12px">${icon('circle-alert')}<span>${r.out}</span></div>` : ''}
      <div class="section-title">输出</div><pre class="log">[08:00:00] 调度器触发 ${a.name}\n[08:00:01] 预检：设备“${a.device}”在线，工作目录 ${a.cwd}\n[08:00:02] ${a.action}\n${r.status === 'failed' ? '[08:00:05] ✕ ' + r.out : '[08:00:41] ✓ ' + r.out}\n[08:00:42] 结果已投递到通知收件箱</pre>
      <dl class="props" style="margin-top:16px"><div class="prop"><dt>触发方式</dt><dd>计划 · ${a.trigger}</dd></div><div class="prop"><dt>运行设备</dt><dd>${a.device}</dd></div><div class="prop"><dt>运行 ID</dt><dd class="mono">${r.id}</dd></div></dl></div>
      <footer class="detail-foot"><button class="btn btn-secondary" data-action="auto-back">${icon('arrow-left', 'ico-sm')}返回定义</button><span class="spacer"></span>${r.status === 'failed' ? h`<button class="btn btn-primary" data-action="auto-run" data-id="${a.id}">${icon('rotate-ccw', 'ico-sm')}重新运行</button>` : ''}</footer>`;
    }
    const a = DATA.automations.find(x => x.id === I.id);
    if (!a) return h`<header class="detail-head"><h2 tabindex="-1">找不到这个自动化</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header><div class="detail-body"><div class="empty" style="min-height:200px"><span class="empty-mark">${icon('circle-x', 'ico-lg')}</span><h3>链接指向的自动化不存在</h3><p>它可能已被删除，或属于另一台设备。列表仍保留在左侧。</p><button class="btn btn-secondary btn-sm" data-action="auto-close">关闭</button></div></div>`;
    const runs = DATA.runs.filter(r => r.auto === a.id);
    return h`<header class="detail-head"><span class="kind-tile kind-${a.kind}">${icon(kindIcon[a.kind])}</span><h2 class="truncate" tabindex="-1">${a.name}</h2>${this.switchHTML(a, 'detail-switch')}<button class="btn btn-ghost btn-icon btn-sm" data-action="auto-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="tabs detail-tabs" role="tablist"><button class="tab" role="tab" aria-selected="${I.tab === 'overview'}" data-action="auto-tab" data-v="overview">概览</button><button class="tab" role="tab" aria-selected="${I.tab === 'runs'}" data-action="auto-tab" data-v="runs">运行记录<span class="count">${runs.length}</span></button></div>
    <div class="detail-body hu-scroll">${I.tab === 'overview' ? h`
      <div class="last-run st-${a.last.status}"><div class="row">${runBadge(a.last.status)}<span class="muted">上次运行 · ${a.last.at}${a.last.dur ? ' · ' + a.last.dur : ''}</span></div>${a.last.error ? h`<p class="last-run-err">${a.last.error}</p>` : ''}</div>
      <dl class="props" style="margin-top:12px"><div class="prop"><dt>触发</dt><dd>${a.trigger}</dd></div><div class="prop"><dt>下次运行</dt><dd class="num">${a.enabled ? a.next : '已停用'}</dd></div><div class="prop"><dt>动作</dt><dd>${a.action}</dd></div><div class="prop"><dt>运行设备</dt><dd>${icon('laptop', 'ico-sm')} ${a.device}</dd></div><div class="prop"><dt>工作目录</dt><dd class="mono truncate">${a.cwd}</dd></div><div class="prop"><dt>结果投递</dt><dd>通知收件箱</dd></div></dl>
      <p class="field-help" style="margin-top:12px">启停只改变是否按计划触发，不会取消已经开始的运行。</p>`
      : h`<ul class="run-list">${runs.length ? runs.map(r => h`<li><button class="run-item" data-action="auto-run-open" data-id="${r.id}">${runBadge(r.status)}<span class="grow num">${r.at}</span><span class="muted num">${r.dur}</span>${icon('chevron-right', 'ico-sm')}</button></li>`) : raw('<p class="muted">还没有运行记录。</p>')}</ul><button class="btn btn-ghost btn-sm" style="margin-top:8px" data-action="auto-all-runs">查看全部运行记录 ${icon('arrow-right', 'ico-sm')}</button>`}</div>
    <footer class="detail-foot"><button class="btn btn-primary" data-action="auto-run" data-id="${a.id}">${icon('play', 'ico-sm')}立即运行</button><button class="btn btn-secondary" data-action="auto-edit" data-id="${a.id}">${icon('pencil', 'ico-sm')}编辑</button><span class="spacer"></span><button class="btn btn-ghost btn-icon" data-action="auto-menu" data-id="${a.id}" aria-label="更多操作">${icon('ellipsis')}</button></footer>`;
  },
  mountDetail() {
    const d = $('#detail'); if (d.__b) return; d.__b = 1;
    d.addEventListener('click', e => { const sw = e.target.closest('[data-switch]'); if (sw) { e.stopPropagation(); this.toggle(sw.dataset.switch); } });
  },
  editForm(a, isNew) {
    return h`<div class="field"><label class="field-label" for="ae-name">名称<span class="req" aria-hidden="true">*</span></label><input class="input" id="ae-name" value="${a.name}" ${isNew ? raw('autofocus') : ''} placeholder="例如：每日晨间简报"></div>
      <div class="field"><span class="field-label" id="ae-trig-l">触发方式</span><div class="seg" role="radiogroup" aria-labelledby="ae-trig-l"><button type="button" role="radio" aria-checked="true">按计划</button><button type="button" role="radio" aria-checked="false">按间隔</button><button type="button" role="radio" aria-checked="false">文件变化</button></div></div>
      <div class="field-grid" style="margin-top:16px"><div class="field"><label class="field-label" for="ae-start">首次运行</label>${dateField({ id: 'ae-start', value: '2026-11-06 08:00', label: '首次运行', time: true, min: ymd(TODAY) })}<span class="field-help">时区：Asia/Shanghai（本机）</span></div>
        <div class="field"><label class="field-label" for="ae-until">结束日期</label>${dateField({ id: 'ae-until', value: '', label: '结束日期', min: ymd(TODAY) })}<span class="field-help">留空表示一直运行</span></div>
        <div class="field span-2"><span class="field-label">重复</span><div class="row weekdays" role="group" aria-label="每周重复">${['一', '二', '三', '四', '五', '六', '日'].map((d, i) => h`<button type="button" class="btn btn-sm ${i < 5 ? 'btn-primary' : 'btn-secondary'}" aria-pressed="${i < 5}">${d}</button>`)}</div></div></div>
      <div class="field" style="margin-top:16px"><label class="field-label" for="ae-action">动作</label><select class="select" id="ae-action"><option>运行智能体提示词</option><option>运行脚本</option><option>同步导入</option><option>发送通知</option></select></div>
      <div class="field"><label class="field-label" for="ae-cwd">工作目录</label><div class="input-group">${icon('folder', 'ico-sm')}<input class="input mono" id="ae-cwd" value="${a.cwd}"></div></div>
      <div class="field"><label class="choice"><button type="button" class="switch" role="switch" aria-checked="true" aria-label="失败时通知" onclick="this.setAttribute('aria-checked',this.getAttribute('aria-checked')!=='true')"></button><span class="choice-text"><span>失败时通知我</span><span class="field-help">结果写入通知收件箱，并可推送到系统通知</span></span></label></div>`;
  },
  openEdit(id) {
    const a = DATA.automations.find(x => x.id === id); let dirty = false;
    openLayer({ kind: 'dialog', className: 'dialog-lg', label: '编辑自动化', guard: () => { if (!dirty) return true; confirmDialog({ title: '放弃修改？', body: '编辑内容尚未保存。', confirm: '放弃', danger: true, onConfirm: () => closeTop(true) }); return false; },
      content: h`<form id="ae-form" novalidate><div class="dialog-head"><div><h2>编辑自动化</h2><p>${a.name}</p></div><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div><div class="dialog-body">${this.editForm(a)}</div><div class="dialog-foot"><span class="left">保存后从下一次调度开始生效</span><button type="button" class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" type="submit">保存</button></div></form>` });
    const f = $('#ae-form'); mountDateFields(f, () => { dirty = true; }); f.addEventListener('input', () => { dirty = true; });
    f.addEventListener('submit', e => { e.preventDefault(); const n = $('#ae-name').value.trim(); if (!n) { $('#ae-name').setAttribute('aria-invalid', 'true'); $('#ae-name').focus(); return; } a.name = n; a.cwd = $('#ae-cwd').value; closeTop(true); S.state = 'detail'; this.syncRow(a.id); renderDetail(); toast('已保存，下次调度生效'); });
  },
  newPage() {
    return h`${pageHead('新建自动化', { crumb: h`<button data-action="auto-cancel-new">自动化</button>${icon('chevron-right', 'ico-sm')}`, actions: h`<button class="btn btn-secondary" data-action="auto-cancel-new">取消</button><button class="btn btn-primary" data-action="auto-create">创建并启用</button>` })}
    <div class="page-body hu-scroll"><div class="page-pad"><div class="form-page"><section class="form-section"><div class="form-section-head"><h2>基本信息</h2><p>名称会出现在通知和运行记录里。</p></div><div class="card card-body" id="new-form">${this.editForm({ name: '', cwd: 'huhu/' }, true)}</div></section></div></div></div>`;
  },
  allRuns() {
    return h`${pageHead('全部运行记录', { crumb: h`<button data-action="auto-back-list">自动化</button>${icon('chevron-right', 'ico-sm')}`, actions: h`${dateRangeTrigger('runs-range', { from: '2026-10-29', to: ymd(TODAY) })}` })}
    <div class="page-body hu-scroll"><div class="page-pad"><div class="table-wrap"><table class="table"><thead><tr><th>自动化</th><th>结果</th><th>开始</th><th class="num">用时</th><th>设备</th></tr></thead><tbody>${DATA.runs.map(r => { const a = DATA.automations.find(x => x.id === r.auto); return h`<tr data-action="auto-run-row" data-id="${r.id}" tabindex="0"><td class="primary">${a.name}</td><td>${runBadge(r.status)}</td><td class="num">${r.at}</td><td class="num">${r.dur}</td><td class="muted">${a.device}</td></tr>`; })}</tbody></table></div></div></div>`;
  },
  actions: {
    'auto-filter': el => { const P = PAGES.automations; P.filter = el.dataset.v; $$('[data-action="auto-filter"]').forEach(b => b.setAttribute('aria-checked', b === el)); P.refresh(); },
    'auto-close': () => PAGES.automations.closeDetail(),
    'auto-tab': el => { PAGES.automations.insp.tab = el.dataset.v; S.state = el.dataset.v === 'runs' ? 'detail-runs' : 'detail'; renderDetail(); $(`#detail [data-v="${el.dataset.v}"]`)?.focus(); },
    'auto-run-open': el => { const r = DATA.runs.find(x => x.id === el.dataset.id); PAGES.automations.insp = { kind: 'run', id: r.id, back: r.auto }; S.state = 'run-detail'; renderDetail(); $('#detail .detail-head h2')?.focus(); },
    'auto-back': () => { const P = PAGES.automations; P.insp = { kind: 'definition', id: P.insp.back, tab: 'runs' }; S.state = 'detail-runs'; renderDetail(); },
    'auto-run': el => { const a = DATA.automations.find(x => x.id === el.dataset.id); el.classList.add('is-busy'); el.innerHTML = html(h`<span class="spinner" style="width:14px;height:14px;border-color:rgb(255 255 255 / .35);border-top-color:currentColor"></span>运行中`); a.last = { at: '刚刚', status: 'running', dur: '' }; PAGES.automations.syncRow(a.id);
      setTimeout(() => { a.last = { at: '刚刚', status: 'success', dur: '3 秒' }; const run = { id: nextId('run'), auto: a.id, at: '刚刚', status: 'success', dur: '3 秒', out: '手动运行完成。' }; DATA.runs.unshift(run); PAGES.automations.syncRow(a.id); if (S.page === 'automations' && PAGES.automations.insp) { PAGES.automations.insp = { kind: 'run', id: run.id, back: a.id }; S.state = 'run-detail'; renderDetail(); } toast(`“${a.name}”运行完成`); }, 1100); },
    'auto-edit': el => PAGES.automations.openEdit(el.dataset.id),
    'auto-menu': el => menu(el, [{ id: 'dup', label: '复制', icon: 'copy' }, { id: 'link', label: '复制深链', icon: 'link', run: () => toast('已复制深链（原型模拟）', { kind: 'info' }) }, '-', { id: 'del', label: '删除', icon: 'trash-2', danger: true, run: () => confirmDialog({ title: '删除这个自动化？', body: '计划会立即停止，运行记录保留。', confirm: '删除', danger: true, onConfirm: () => toast('已删除（原型未真正移除）', { kind: 'info' }) }) }]),
    'auto-all-runs': () => { PAGES.automations.mode = 'runs'; S.state = 'all-runs'; renderMain(); renderDetail(); },
    'auto-back-list': () => { PAGES.automations.mode = 'list'; S.state = 'default'; renderMain(); renderDetail(); },
    'auto-run-row': el => { const r = DATA.runs.find(x => x.id === el.dataset.id); const P = PAGES.automations; P.mode = 'list'; P.insp = { kind: 'run', id: r.id, back: r.auto }; S.state = 'run-detail'; renderMain(); renderDetail(); },
    'auto-new': () => PAGES.automations.openNew(),
    'auto-cancel-new': () => { PAGES.automations.mode = 'list'; S.state = 'default'; renderMain(); },
    'auto-create': () => { const n = $('#ae-name'); if (!n.value.trim()) { n.setAttribute('aria-invalid', 'true'); if (!$('#ae-name-err')) n.insertAdjacentHTML('afterend', html(h`<div class="field-error" id="ae-name-err">${icon('circle-alert')}<span>请填写名称</span></div>`)); n.setAttribute('aria-describedby', 'ae-name-err'); n.focus(); return; }
      const a = { id: nextId('a'), name: n.value.trim(), trigger: '工作日 08:00', kind: 'agent', action: '运行智能体提示词', device: '这台电脑', cwd: $('#ae-cwd').value, enabled: true, last: { at: '尚未运行', status: 'none', dur: '' }, next: '明天 08:00' };
      DATA.automations.unshift(a); const P = PAGES.automations; P.mode = 'list'; P.insp = { kind: 'definition', id: a.id, tab: 'overview' }; S.state = 'detail'; renderMain(); renderDetail(); toast('已创建并启用'); },
    'auto-retry': () => { S.state = 'loading'; renderMain(); setTimeout(() => { S.state = 'default'; renderMain(); }, 600); },
    daterange: el => openDateRange(el, { from: '2026-10-29', to: ymd(TODAY) }, () => toast('已按日期筛选（原型）', { kind: 'info' })),
  },
  openNew() { this.mode = 'new'; this.insp = null; S.state = 'new'; renderMain(); renderDetail(); mountDateFields($('#main')); $('#ae-name')?.focus(); },
};

/* ==========================================================================
   智能体 · sessions, terminal tabs/split, inbox, history, usage
   ========================================================================== */
const agentMark = s => h`<span class="agent-mark agent-${s.agent.toLowerCase()}" aria-hidden="true">${s.agent.slice(0, 1)}</span>`;
const sessDot = st => ({ working: 'dot-working', blocked: 'dot-warning', idle: 'dot-success' }[st] || '');
const sessLabel = st => ({ working: '运行中', blocked: '等待你的回答', idle: '空闲' }[st]);
PAGES.agent = {
  title: '智能体', states: ['default', 'split', 'blocked', 'info', 'history', 'usage', 'empty'],
  active: 's1', split: false, view: 'terminal', info: false,
  enter(s) { this.applyState(s); },
  applyState(s) { this.view = s === 'history' ? 'history' : s === 'usage' ? 'usage' : 'terminal'; this.split = s === 'split'; this.active = s === 'blocked' ? 's2' : 's1'; this.info = s === 'info'; },
  sessions() { return S.state === 'empty' ? [] : DATA.sessions; },
  panel() {
    const ss = this.sessions(); const ws = [...new Set(ss.map(s => s.ws))];
    return h`<div class="panel-head"><h2>智能体</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-new" aria-label="新建会话">${icon('plus', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${ws.map(w => h`<div class="tree-group">${icon('folder', 'ico-sm')}${w}</div>${ss.filter(s => s.ws === w).map(s => h`<button class="nav-item sess-item" data-action="agent-open" data-id="${s.id}" aria-current="${this.view === 'terminal' && this.active === s.id}">${agentMark(s)}<span class="truncate grow">${s.title}</span><span class="dot ${sessDot(s.status)}" title="${sessLabel(s.status)}"></span><span class="sr-only">${sessLabel(s.status)}</span></button>`)}`)}
      ${ss.length ? '' : raw('<p class="muted" style="padding:8px 16px;font-size:13px">没有运行中的会话</p>')}
      <div class="tree-group">工具</div>
      <button class="nav-item" data-action="agent-view" data-v="history" aria-current="${this.view === 'history'}">${icon('history')}<span>历史会话</span></button>
      <button class="nav-item" data-action="agent-view" data-v="inbox">${icon('inbox')}<span>智能体收件箱</span><span class="count">1</span></button>
      <button class="nav-item" data-action="agent-view" data-v="usage" aria-current="${this.view === 'usage'}">${icon('activity')}<span>用量</span></button>
      <button class="nav-item" data-action="agent-view" data-v="accounts">${icon('user')}<span>账号与 CLI</span></button></div>`;
  },
  main() {
    if (this.view === 'history') return this.history();
    if (this.view === 'usage') return this.usage();
    const ss = this.sessions();
    if (!ss.length) return h`${pageHead('智能体')}<div class="page-body"><div class="empty" style="min-height:64vh"><span class="empty-mark">${icon('bot', 'ico-lg')}</span><h2>开始一个会话</h2><p>在库内目录中运行 Claude Code、Codex 或普通终端。会话在关闭工作台后继续保留。</p><div class="row"><button class="btn btn-primary" data-action="agent-new">${icon('plus')}新建会话</button><button class="btn btn-secondary" data-action="agent-view" data-v="history">打开历史会话</button></div></div></div>`;
    const cur = ss.find(s => s.id === this.active) || ss[0];
    const tabs = h`<div class="term-tabs" role="tablist" aria-label="会话">${ss.map(s => h`<div class="term-tab" role="tab" aria-selected="${s.id === cur.id}" data-action="agent-open" data-id="${s.id}" tabindex="${s.id === cur.id ? 0 : -1}">${agentMark(s)}<span class="truncate">${s.title}</span><span class="dot ${sessDot(s.status)}"></span><button class="term-tab-x" aria-label="关闭 ${s.title}" data-action="agent-close" data-id="${s.id}">${icon('x', 'ico-sm')}</button></div>`)}<button class="btn btn-ghost btn-icon btn-sm" data-action="agent-new" aria-label="新建会话">${icon('plus', 'ico-sm')}</button></div>`;
    const tools = h`<button class="btn btn-ghost btn-icon btn-sm" data-action="agent-split" aria-pressed="${this.split}" aria-label="左右分屏">${icon('columns-2', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="在终端中搜索">${icon('search', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-info" aria-pressed="${this.info}" aria-label="会话信息">${icon('panel-right', 'ico-sm')}</button>`;
    const pane = s => h`<section class="term-pane" aria-label="${s.title}"><header class="term-bar">${agentMark(s)}<span class="truncate">${s.agent} · ${s.model}</span><span class="muted mono truncate">${s.cwd}</span><span class="spacer"></span><span class="badge ${s.status === 'blocked' ? 'badge-warning' : s.status === 'working' ? 'badge-accent' : ''}"><span class="dot ${sessDot(s.status)}"></span>${sessLabel(s.status)}</span></header><div class="term hu-scroll" tabindex="0" aria-label="${s.title} 终端输出" role="log">${raw(this.termText(s))}</div></section>`;
    const blocked = ss.find(s => s.status === 'blocked');
    return h`<header class="page-head term-head">${panelToggle()}<h1 id="page-title" class="sr-only">智能体会话 · ${cur.title}</h1>${tabs}<div class="actions">${tools}</div></header>
      ${blocked && (S.state === 'blocked' || cur.id !== blocked.id) ? h`<div class="page-banner"><div class="notice notice-warning">${icon('message-square-text')}<div class="grow"><p class="notice-title">${blocked.agent} 请求运行 <span class="mono">pnpm test</span></p><p>会话“${blocked.title}”正在等待你的确认。请定位到该终端后按 CLI 的实际提示回答。</p></div>${cur.id !== blocked.id ? h`<button class="btn btn-secondary btn-sm" data-action="agent-open" data-id="${blocked.id}">前往会话</button>` : h`<button class="btn btn-secondary btn-sm" data-action="agent-locate">定位终端</button>`}</div></div>` : ''}
      <div class="page-body term-area ${this.split ? 'is-split' : ''}">${pane(cur)}${this.split ? pane(ss.find(s => s.id !== cur.id) || cur) : ''}</div>`;
  },
  termText(s) {
    const L = (cls, t) => `<div class="tl ${cls}">${esc(t)}</div>`;
    if (s.id === 's2') return [L('dim', '› review the virtual scrolling in src/ui/components/tree.tsx'), L('', '读取 tree.tsx、tree.dom.test.tsx …'), L('ok', '✓ 行高估算 28px 与 CSS 一致'), L('warn', '! 改为 32px 时 estimateSize 需要同步，否则焦点行会错位'), L('', ''), L('ask', '需要运行测试来确认：'), L('ask', '  $ pnpm exec vitest run --project dom src/ui/components/tree.dom.test.tsx'), L('ask', '  允许运行？ [y] 允许一次  [a] 本会话总是允许  [n] 拒绝'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
    if (s.id === 's3') return [L('dim', '› 根据本周日记和任务写一份周报草稿'), L('', '已读取 7 篇日记、12 项任务。'), L('ok', '✓ 草稿写入 huhu/journal/2026-W45 周报.md'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
    return [L('dim', '› 把 tokens.css 里的局部颜色收敛到语义 token'), L('', '搜索 src/ 下的颜色字面量 …  共 47 处'), L('ok', '✓ 按钮、字段、Switch 已改为 --hu-accent / --hu-control-line'), L('ok', '✓ 删除 3 个只服务旧布局的选择器'), L('', '  src/ui/styles/tokens.css   +38 −61'), L('', '  src/ui/components/button.tsx  +6 −14'), L('warn', '! 看板 --db-* 仍是派生变量，保持不动'), L('', ''), L('run', '● 运行 pnpm run lint:css …'), `<div class="tl cursor">› <span class="caret"></span></div>`].join('');
  },
  detail() {
    if (!this.info || this.view !== 'terminal') return null;
    const s = this.sessions().find(x => x.id === this.active); if (!s) return null;
    return h`<header class="detail-head">${agentMark(s)}<h2 class="truncate">会话信息</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="agent-info" aria-label="关闭会话信息">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><dl class="props"><div class="prop"><dt>状态</dt><dd><span class="badge"><span class="dot ${sessDot(s.status)}"></span>${sessLabel(s.status)}</span></dd></div><div class="prop"><dt>智能体</dt><dd>${s.agent} · ${s.model}</dd></div><div class="prop"><dt>工作目录</dt><dd class="mono truncate">${s.cwd}</dd></div><div class="prop"><dt>本次 Tokens</dt><dd class="num">${s.tokens}</dd></div><div class="prop"><dt>开始于</dt><dd>今天 10:12</dd></div><div class="prop"><dt>账号</dt><dd>个人 · 额度 34%</dd></div></dl>
    <div class="section-title" style="margin-top:20px">改动的文件</div><ul class="mini-list">${['src/ui/styles/tokens.css', 'src/ui/components/button.tsx', 'src/ui/components/switch.tsx'].map(f => h`<li class="mono" style="font-size:12px">${icon('file-text', 'ico-sm')}<span class="truncate grow">${f}</span></li>`)}</ul></div>
    <footer class="detail-foot"><button class="btn btn-secondary">${icon('history', 'ico-sm')}导出记录</button><span class="spacer"></span><button class="btn btn-danger-ghost">结束会话</button></footer>`;
  },
  history() {
    const rows = [['设计 token 收敛', 'Claude', '今天 10:12', '18.2k', '进行中'], ['tree 虚拟滚动评审', 'Codex', '今天 09:40', '9.4k', '等待回答'], ['周报草稿', 'Claude', '昨天 21:05', '3.1k', '已结束'], ['自动化详情布局', 'Claude', '11月3日', '27.9k', '已结束'], ['日期组件选型', 'Codex', '11月2日', '12.6k', '已结束']];
    return h`${pageHead('历史会话', { sub: '最近 30 天 · 24 个会话', actions: dateRangeTrigger('hist-range', { from: '2026-10-07', to: ymd(TODAY) }) })}
    <div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索会话标题与内容" aria-label="搜索历史会话"></div><div class="seg" role="radiogroup" aria-label="智能体"><button role="radio" aria-checked="true">全部</button><button role="radio" aria-checked="false">Claude</button><button role="radio" aria-checked="false">Codex</button></div></div>
    <div class="page-body hu-scroll"><div class="page-pad" style="padding-top:4px"><div class="table-wrap"><table class="table"><thead><tr><th>会话</th><th>智能体</th><th>开始</th><th class="num">Tokens</th><th>状态</th></tr></thead><tbody>${rows.map(r => h`<tr tabindex="0"><td class="primary">${r[0]}</td><td>${r[1]}</td><td class="num">${r[2]}</td><td class="num">${r[3]}</td><td><span class="badge ${r[4] === '进行中' ? 'badge-accent' : r[4] === '等待回答' ? 'badge-warning' : ''}">${r[4]}</span></td></tr>`)}</tbody></table></div></div></div>`;
  },
  usage() {
    const days = [['10/30', 22, 9], ['10/31', 31, 12], ['11/1', 18, 6], ['11/2', 40, 20], ['11/3', 52, 15], ['11/4', 36, 22], ['11/5', 44, 18]];
    return h`${pageHead('用量', { sub: '本周', actions: h`<div class="seg"><button aria-pressed="false">今天</button><button aria-pressed="true">本周</button><button aria-pressed="false">本月</button></div>` })}
    <div class="page-body hu-scroll"><div class="page-pad page-narrow"><div class="kpis"><div class="kpi"><span class="kpi-label">Tokens</span><span class="kpi-value num">34,770</span><span class="kpi-sub up">较上周 +12%</span></div><div class="kpi"><span class="kpi-label">会话</span><span class="kpi-value num">24</span></div><div class="kpi"><span class="kpi-label">Claude 额度</span><span class="kpi-value num">34%</span><div class="progress"><span style="width:34%"></span></div></div><div class="kpi"><span class="kpi-label">Codex 额度</span><span class="kpi-value num">18%</span><div class="progress"><span style="width:18%"></span></div></div></div>
    <section class="card" style="margin-top:20px"><header class="card-head"><h3 class="card-title">${icon('chart-column')}每日用量</h3><span class="spacer"></span><span class="legend"><i style="background:var(--hu-chart-1)"></i>Claude</span><span class="legend"><i style="background:var(--hu-chart-2)"></i>Codex</span></header><div class="card-body"><div class="stack-bars" role="img" aria-label="近 7 天每日用量，11月3日最高">${days.map(([d, a, b]) => h`<div class="sb"><div class="sb-col"><span style="height:${b}%;background:var(--hu-chart-2)"></span><span style="height:${a}%;background:var(--hu-chart-1)"></span></div><span class="sb-l num">${d}</span></div>`)}</div></div></section></div></div>`;
  },
  actions: {
    'agent-open': (el, e) => { if (e.target.closest('[data-action="agent-close"]')) return; const P = PAGES.agent; P.active = el.dataset.id; P.view = 'terminal'; S.state = DATA.sessions.find(s => s.id === el.dataset.id)?.status === 'blocked' ? 'blocked' : 'default'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'agent-close': el => confirmDialog({ title: '关闭这个会话？', body: '终端进程会结束，输出会保存到历史会话。', confirm: '关闭会话', danger: true, onConfirm: () => toast('会话已关闭（原型未真正结束进程）', { kind: 'info' }) }),
    'agent-split': () => { PAGES.agent.split = !PAGES.agent.split; S.state = PAGES.agent.split ? 'split' : 'default'; renderMain(); },
    'agent-info': () => { PAGES.agent.info = !PAGES.agent.info; S.state = PAGES.agent.info ? 'info' : 'default'; renderMain(); renderDetail(); },
    'agent-view': el => { PAGES.agent.view = el.dataset.v; S.state = el.dataset.v; S.panelSheet = false; PAGES.agent.info = false; renderPanel(); renderMain(); renderDetail(); },
    'agent-new': el => menu(el, [{ id: 'c', label: 'Claude Code', icon: 'sparkles', run: () => toast('已在 ~/vault 启动 Claude Code（原型）', { kind: 'info' }) }, { id: 'x', label: 'Codex', icon: 'bot', run: () => toast('已启动 Codex（原型）', { kind: 'info' }) }, { id: 's', label: '普通终端', icon: 'square-terminal' }, '-', { id: 'cwd', label: '选择工作目录…', icon: 'folder-open' }], '新建会话'),
    'agent-locate': () => $('.term')?.focus(),
  },
};

/* ==========================================================================
   日记 · book page reading / writing (periodic notes projection)
   ========================================================================== */
PAGES.diary = {
  title: '日记', states: ['default', 'writing', 'empty-date'], date: ymd(TODAY),
  entries: {
    '2026-11-05': '早上把工作台的配色重新定了一遍：纸一样的米白，墨色的字，只留一种强调色。克制之后，页面反而安静下来，信息自己浮上来。\n\n下午把自动化列表和右侧详情放在一起，终于不用来回跳页面了。记一笔：右详情宽度不够时就变成覆盖层，不要硬挤成四列。',
    '2026-11-04': '整理了档案的目录树。展开和选中分开以后，键盘操作顺手很多。晚上读了半章《设计中的设计》。',
    '2026-11-02': '雨天。在家把净水器滤芯的型号记进了归物本。',
  },
  enter(s) { this.applyState(s); },
  applyState(s) { this.date = s === 'empty-date' ? '2026-11-03' : ymd(TODAY); this.writing = s === 'writing'; },
  panel() {
    const y = 2026, m = 10, first = new Date(y, m, 1), off = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(); const cells = [];
    for (let i = 0; i < off; i++) cells.push(raw('<span></span>'));
    for (let d = 1; d <= days; d++) { const s = ymd(new Date(y, m, d)); cells.push(h`<button class="cal-cell ${s === ymd(TODAY) ? 'is-today' : ''} ${s === this.date ? 'is-sel' : ''}" data-action="diary-day" data-d="${s}" aria-label="${m + 1}月${d}日${this.entries[s] ? '，有日记' : ''}" aria-pressed="${s === this.date}">${d}${this.entries[s] ? raw('<i></i>') : ''}</button>`); }
    return h`<div class="panel-head"><h2>日记</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="diary-today" aria-label="回到今天">${icon('sun', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll"><div class="diary-cal"><div class="mini-cal-head"><strong>2026年11月</strong><span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="上个月">${icon('chevron-left', 'ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" aria-label="下个月">${icon('chevron-right', 'ico-sm')}</button></div><div class="mini-cal">${['一', '二', '三', '四', '五', '六', '日'].map(d => h`<span class="dow">${d}</span>`)}${cells}</div></div>
      <div class="tree-group">本月</div>${Object.keys(this.entries).map(d => h`<button class="nav-item" data-action="diary-day" data-d="${d}" aria-current="${this.date === d}">${icon('file-text')}<span class="grow">${relDay(d)}</span><span class="muted num" style="font-size:12px">${d.slice(5)}</span></button>`)}
      <div class="tree-group">回顾</div><button class="nav-item">${icon('history')}<span>去年今日</span></button><button class="nav-item" data-action="go" data-page="tasks">${icon('list-checks')}<span>本周回顾</span></button></div>`;
  },
  main() {
    const d = this.date, text = this.entries[d], prev = ymd(addDays(parseYmd(d), -1)), next = ymd(addDays(parseYmd(d), 1));
    const nav = h`<button class="btn btn-ghost btn-icon" data-action="diary-day" data-d="${prev}" aria-label="前一天">${icon('chevron-left')}</button><button class="btn btn-ghost btn-icon" data-action="diary-day" data-d="${next}" aria-label="后一天" ${d >= ymd(TODAY) ? raw('disabled') : ''}>${icon('chevron-right')}</button>`;
    const actions = this.writing ? h`<span class="save-state" id="diary-save">已自动保存</span><button class="btn btn-primary" data-action="diary-done">${icon('check')}完成</button>` : h`${nav}<button class="btn btn-secondary" data-action="diary-write">${icon('pen-line', 'ico-sm')}${text ? '继续写' : '写日记'}</button>`;
    let body;
    if (!text && !this.writing) body = h`<div class="book-empty"><span class="empty-mark">${icon('feather', 'ico-lg')}</span><h2>这一天还没有日记</h2><p>写下来的内容会保存为 huhu/journal/${d}.md，使用你的周期笔记模板。</p><button class="btn btn-primary" data-action="diary-write">${icon('pen-line', 'ico-sm')}写这一天</button></div>`;
    else if (this.writing) body = h`<textarea class="book-editor" id="diary-editor" aria-label="${fmtLong(d)} 日记正文" placeholder="今天……">${text || ''}</textarea>`;
    else body = h`<div class="reading book-text">${text.split('\n\n').map(p => h`<p>${p}</p>`)}</div>`;
    return h`${pageHead(fmtLong(d), { actions })}<div class="page-body hu-scroll"><div class="book-wrap"><article class="book" aria-label="日记页"><header class="book-head"><span class="eyebrow">第 ${dayDiff(parseYmd(d), new Date(2026, 0, 1)) + 1} 天 · 2026</span><h2 class="reading-title">${relDay(d) === '今天' ? '今天' : `${parseYmd(d).getMonth() + 1}月${parseYmd(d).getDate()}日`}</h2><p class="muted">${WEEK[parseYmd(d).getDay()]} · 杭州 · 小雨</p></header>${body}<footer class="book-foot"><span class="num">${(text || '').length} 字</span><span class="spacer"></span><span>huhu/journal/${d}.md</span></footer></article></div></div>`;
  },
  mount() { const e = $('#diary-editor'); if (e) { e.focus(); e.addEventListener('input', () => { this.entries[this.date] = e.value; const s = $('#diary-save'); s.textContent = '正在保存…'; clearTimeout(this._t); this._t = setTimeout(() => { s.textContent = '已自动保存'; }, 500); }); } },
  actions: {
    'diary-day': el => { const P = PAGES.diary; P.date = el.dataset.d; P.writing = false; S.state = P.entries[P.date] ? 'default' : 'empty-date'; S.panelSheet = false; renderPanel(); renderMain(); },
    'diary-today': () => PAGES.diary.actions['diary-day']({ dataset: { d: ymd(TODAY) } }),
    'diary-write': () => { PAGES.diary.writing = true; S.state = 'writing'; renderMain(); },
    'diary-done': () => { const P = PAGES.diary; P.writing = false; if (!P.entries[P.date]?.trim()) delete P.entries[P.date]; S.state = P.entries[P.date] ? 'default' : 'empty-date'; renderPanel(); renderMain(); toast('日记已保存'); },
  },
};

/* ==========================================================================
   通知 · inbox list + inspector
   ========================================================================== */
PAGES.notifications = {
  title: '通知', states: ['default', 'detail', 'empty', 'error'], filter: 'all', sel: null,
  enter(s) { this.applyState(s); }, applyState(s) { this.sel = s === 'detail' ? 'n1' : null; },
  main() {
    const st = S.state, list = st === 'empty' ? [] : DATA.notifications.filter(n => this.filter === 'all' || !n.read);
    const head = pageHead('通知', { sub: `${DATA.unread()} 条未读`, actions: h`<div class="seg" role="radiogroup" aria-label="筛选"><button role="radio" aria-checked="${this.filter === 'unread'}" data-action="nt-filter" data-v="unread">未读</button><button role="radio" aria-checked="${this.filter === 'all'}" data-action="nt-filter" data-v="all">全部</button></div><button class="btn btn-ghost" data-action="nt-readall" ${DATA.unread() ? '' : raw('disabled')}>${icon('check', 'ico-sm')}<span class="hide-sm">全部已读</span></button><button class="btn btn-ghost btn-icon" data-action="go" data-page="settings" aria-label="通知设置">${icon('sliders-horizontal')}</button>` });
    if (st === 'error') return h`${head}<div class="page-body"><div class="page-pad"><div class="notice notice-error">${icon('circle-alert')}<div><p class="notice-title">收件箱读取失败</p><p>通知不会丢失，恢复后会按时间顺序补齐。</p></div><button class="btn btn-secondary btn-sm" data-action="nt-retry">重试</button></div></div></div>`;
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('inbox', 'ico-lg')}</span><h2>${this.filter === 'unread' && st !== 'empty' ? '没有未读通知' : '收件箱是空的'}</h2><p>自动化结果、智能体提问和提醒都会出现在这里。</p></div></div>`;
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow" style="padding-top:12px"><div class="list nt-list" role="list">${list.map(n => h`<div class="list-row nt-row ${n.read ? '' : 'is-unread'}" role="listitem" tabindex="0" data-action="nt-open" data-id="${n.id}" aria-selected="${this.sel === n.id}"><span class="nt-icon nt-${n.kind}">${icon(n.icon)}</span><div class="list-row-main"><span class="list-row-title truncate">${n.title}</span><span class="list-row-meta"><span>${n.source}</span><span class="sep"></span><span>${n.at}</span></span></div>${n.read ? '' : raw('<span class="dot dot-accent" aria-label="未读"></span>')}</div>`)}</div></div></div>`;
  },
  detail() {
    const n = DATA.notifications.find(x => x.id === this.sel); if (!n) return null;
    return h`<header class="detail-head"><span class="nt-icon nt-${n.kind}">${icon(n.icon)}</span><h2 class="truncate" tabindex="-1">${n.source}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="nt-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><h3 class="detail-title">${n.title}</h3><p class="muted" style="margin:4px 0 12px">${n.at}</p><p class="fg2">${n.body}</p>${n.kind === 'danger' ? h`<div class="notice notice-error" style="margin-top:16px">${icon('circle-alert')}<span>投递回执：已写入收件箱 · 系统通知已发送</span></div>` : ''}</div>
    <footer class="detail-foot"><button class="btn btn-primary" data-action="go" data-page="${n.target}">打开来源 ${icon('arrow-right', 'ico-sm')}</button><span class="spacer"></span><button class="btn btn-ghost" data-action="nt-unread" data-id="${n.id}">标为未读</button></footer>`;
  },
  closeDetail() { const id = this.sel; this.sel = null; S.state = 'default'; $$('.nt-row').forEach(r => r.setAttribute('aria-selected', 'false')); renderDetail(); $(`[data-id="${id}"]`)?.focus(); },
  actions: {
    'nt-open': el => { const P = PAGES.notifications, n = DATA.notifications.find(x => x.id === el.dataset.id); P.sel = n.id; n.read = true; S.state = 'detail'; renderRail(); renderStatus(); renderMain(); renderDetail(); },
    'nt-close': () => PAGES.notifications.closeDetail(),
    'nt-filter': el => { PAGES.notifications.filter = el.dataset.v; renderMain(); },
    'nt-readall': () => { DATA.notifications.forEach(n => { n.read = true; }); renderRail(); renderStatus(); renderMain(); toast('已全部标为已读'); },
    'nt-unread': el => { DATA.notifications.find(x => x.id === el.dataset.id).read = false; renderRail(); renderStatus(); renderMain(); },
    'nt-retry': () => { S.state = 'default'; renderMain(); },
  },
};

/* ==========================================================================
   保险箱 · locked → list/detail; quick pick
   ========================================================================== */
const SAFE_CATS = [['login', '登录', 'key-round'], ['card', '银行卡', 'credit-card'], ['note', '安全笔记', 'sticky-note'], ['id', '证件', 'id-card']];
PAGES.safe = {
  title: '保险箱', states: ['locked', 'error', 'default', 'detail', 'revealed', 'quick-pick', 'empty'], unlocked: false, cat: 'login', sel: null, reveal: false,
  enter(s) { this.applyState(s); },
  applyState(s) { this.unlocked = !['locked', 'error'].includes(s); this.cat = s === 'empty' ? 'id' : 'login'; this.sel = ['detail', 'revealed'].includes(s) ? 'v-1' : null; this.reveal = s === 'revealed'; if (s === 'quick-pick') setTimeout(() => this.quick(), 0); },
  panel() {
    if (!this.unlocked) return null;
    return h`<div class="panel-head"><h2>保险箱</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="safe-lock" aria-label="立即锁定">${icon('lock', 'ico-sm')}</button></div>
    <div class="panel-body hu-scroll">${SAFE_CATS.map(([id, n, ic]) => h`<button class="nav-item" data-action="safe-cat" data-id="${id}" aria-current="${this.cat === id}">${icon(ic)}<span>${n}</span><span class="count">${DATA.vault.filter(v => v.cat === id).length || ''}</span></button>`)}
    <div class="tree-group">安全</div><button class="nav-item" data-action="safe-quick-btn">${icon('zap')}<span>快速取密</span><span class="kbd" style="margin-left:auto">命令面板</span></button><button class="nav-item">${icon('shield-check')}<span>密码体检</span></button></div>
    <div class="panel-foot"><p class="muted" style="font-size:12px">${icon('timer', 'ico-sm')} 4 分钟无操作后自动锁定</p></div>`;
  },
  main() {
    if (!this.unlocked) return h`${pageHead('保险箱')}<div class="page-body"><div class="lock-screen"><form class="card lock-card" id="unlock-form"><span class="lock-mark">${icon('lock-keyhole', 'ico-xl')}</span><h2>保险箱已锁定</h2><p class="muted">输入主密码解锁。解锁内容只保留在内存中。</p>
      <div class="field" style="width:100%;margin-top:8px"><label class="sr-only" for="safe-pw">主密码</label><div class="input-group"><input class="input input-lg" type="password" id="safe-pw" placeholder="主密码" autocomplete="off" ${S.state === 'error' ? raw('aria-invalid="true" aria-describedby="pw-err"') : ''} autofocus><span class="input-suffix"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-action="safe-pw-eye" aria-label="显示密码">${icon('eye', 'ico-sm')}</button></span></div>${S.state === 'error' ? h`<div class="field-error" id="pw-err">${icon('circle-alert')}<span>主密码不正确，请检查后重试</span></div>` : ''}</div>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon('lock-open')}解锁</button><p class="field-help">演示密码：<span class="mono">huhu-demo</span>，请勿输入真实凭据。</p></form></div></div>`;
    const list = DATA.vault.filter(v => v.cat === this.cat), cat = SAFE_CATS.find(c => c[0] === this.cat);
    const head = pageHead(cat[1], { sub: `${list.length} 项`, actions: h`<button class="btn btn-ghost" data-action="safe-quick-btn">${icon('zap', 'ico-sm')}<span class="hide-sm">快速取密</span></button><button class="btn btn-primary" data-action="safe-new">${icon('plus')}<span class="hide-sm">新建</span></button>` });
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon(cat[2], 'ico-lg')}</span><h2>还没有${cat[1]}</h2><p>条目使用主密码加密保存在 .huhu/safe/，不会出现在笔记搜索中。</p><div class="row"><button class="btn btn-primary" data-action="safe-new">${icon('plus')}新建${cat[1]}</button></div></div></div>`;
    return h`${head}<div class="page-toolbar"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索名称、用户名或网址" aria-label="搜索保险箱"></div></div><div class="page-body hu-scroll"><div class="list safe-list" role="list" style="padding:0 12px 24px">${list.map(v => h`<div class="list-row" role="listitem" tabindex="0" data-action="safe-open" data-id="${v.id}" aria-selected="${this.sel === v.id}"><span class="avatar avatar-sq">${v.title.slice(0, 1)}</span><div class="list-row-main"><span class="list-row-title truncate">${v.title}</span><span class="list-row-meta">${v.user}${v.url ? h`<span class="sep"></span>${v.url}` : ''}</span></div><span class="muted num" style="font-size:12px">${v.updated}</span><button class="btn btn-ghost btn-icon btn-sm row-actions" data-action="safe-copy" data-id="${v.id}" aria-label="复制 ${v.title} 的密码">${icon('copy', 'ico-sm')}</button></div>`)}</div></div>`;
  },
  detail() {
    if (!this.unlocked) return null; const v = DATA.vault.find(x => x.id === this.sel); if (!v) return null;
    const row = (label, value, { secret = false, mono = false } = {}) => h`<div class="secret-row"><span class="secret-label">${label}</span><span class="secret-val ${mono || secret ? 'mono' : ''}">${secret && !this.reveal ? '••••••••••••' : value}</span>${secret ? h`<button class="btn btn-ghost btn-icon btn-sm" data-action="safe-reveal" aria-label="${this.reveal ? '隐藏' : '显示'}${label}" aria-pressed="${this.reveal}">${icon(this.reveal ? 'eye-off' : 'eye', 'ico-sm')}</button>` : ''}<button class="btn btn-ghost btn-icon btn-sm" data-action="safe-copy" data-id="${v.id}" aria-label="复制${label}">${icon('copy', 'ico-sm')}</button></div>`;
    return h`<header class="detail-head"><span class="avatar avatar-sq">${v.title.slice(0, 1)}</span><h2 class="truncate" tabindex="-1">${v.title}</h2><button class="btn btn-ghost btn-icon btn-sm" data-action="safe-close" aria-label="关闭详情">${icon('x', 'ico-sm')}</button></header>
    <div class="detail-body hu-scroll"><div class="secret-card">${row('用户名', v.user)}${row(v.cat === 'card' ? '卡号' : '密码', v.secret, { secret: true })}${v.url ? row('网址', v.url) : ''}</div>
    ${v.note ? h`<div class="section-title" style="margin-top:16px">备注</div><p class="fg2" style="font-size:13px">${v.note}</p>` : ''}
    <dl class="props" style="margin-top:16px"><div class="prop"><dt>修改</dt><dd>${v.updated}</dd></div><div class="prop"><dt>密码强度</dt><dd><span class="badge badge-success">强</span></dd></div><div class="prop"><dt>关联</dt><dd><button class="link-card" style="width:100%">${icon('user', 'ico-sm')}<span class="grow truncate">个人账号</span></button></dd></div></dl></div>
    <footer class="detail-foot"><button class="btn btn-secondary">${icon('pencil', 'ico-sm')}编辑</button><span class="spacer"></span><button class="btn btn-danger-ghost">${icon('trash-2', 'ico-sm')}删除</button></footer>`;
  },
  closeDetail() { const id = this.sel; this.sel = null; this.reveal = false; S.state = 'default'; renderMain(); renderDetail(); $(`[data-id="${id}"]`)?.focus(); },
  mount() {
    $('#unlock-form')?.addEventListener('submit', e => { e.preventDefault(); const pw = $('#safe-pw').value; if (pw === 'huhu-demo') { this.unlocked = true; S.state = 'default'; render(); toast('已解锁，4 分钟后自动锁定'); } else { S.state = 'error'; renderMain(); $('#safe-pw').focus(); } });
  },
  quick() {
    if (!this.unlocked) { toast('请先解锁保险箱', { kind: 'info' }); return; }
    let sel = 0, items = DATA.vault;
    openLayer({ kind: 'dialog', className: 'dialog-sm quick', label: '快速取密', content: h`<div class="cmd-input">${icon('key-round', 'ico-lg')}<input id="qp-q" placeholder="搜索并按回车复制密码" autocomplete="off" aria-label="搜索保险箱条目" role="combobox" aria-expanded="true" aria-controls="qp-list"></div><div class="cmd-list" id="qp-list" role="listbox"></div><div class="cmd-foot"><span><span class="kbd">↵</span>复制密码</span><span><span class="kbd">⇧↵</span>复制用户名</span><span>30 秒后核对剪贴板内容再清除</span></div>` });
    const draw = () => { const q = $('#qp-q').value.trim().toLowerCase(); items = DATA.vault.filter(v => !q || (v.title + v.user + v.url).toLowerCase().includes(q)); sel = Math.min(sel, Math.max(0, items.length - 1)); $('#qp-list').innerHTML = items.length ? items.map((v, i) => html(h`<button class="cmd-item" role="option" data-i="${i}" aria-selected="${i === sel}"><span class="avatar avatar-sq" style="width:22px;height:22px;font-size:12px">${v.title.slice(0, 1)}</span><span class="truncate">${v.title}</span><span class="hint">${v.user}</span></button>`)).join('') : html(h`<div class="empty" style="min-height:120px"><p>没有匹配的条目</p></div>`); };
    const pick = (i, user) => { const v = items[i]; if (!v) return; closeTop(true); toast(`已复制 ${v.title} 的${user ? '用户名' : '密码'}（模拟），30 秒后仅清除未被替换的内容`); };
    $('#qp-q').addEventListener('input', () => { sel = 0; draw(); });
    $('#qp-q').addEventListener('keydown', e => { if (e.isComposing) return; if (e.key === 'ArrowDown') { sel = (sel + 1) % Math.max(1, items.length); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = (sel - 1 + items.length) % Math.max(1, items.length); draw(); e.preventDefault(); } if (e.key === 'Enter') { pick(sel, e.shiftKey); e.preventDefault(); } });
    $('#qp-list').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i); });
    draw();
  },
  actions: {
    'safe-open': (el, e) => { if (e.target.closest('[data-action="safe-copy"]')) return; const P = PAGES.safe; P.sel = el.dataset.id; P.reveal = false; S.state = 'detail'; $$('.safe-list .list-row').forEach(r => r.setAttribute('aria-selected', r.dataset.id === P.sel)); renderDetail(); },
    'safe-close': () => PAGES.safe.closeDetail(),
    'safe-cat': el => { const P = PAGES.safe; P.cat = el.dataset.id; P.sel = null; S.state = DATA.vault.some(v => v.cat === P.cat) ? 'default' : 'empty'; S.panelSheet = false; renderPanel(); renderMain(); renderDetail(); },
    'safe-lock': () => { const P = PAGES.safe; P.unlocked = false; P.sel = null; P.reveal = false; S.state = 'locked'; closeAll(); render(); toast('保险箱已锁定，内存中的明文已清除', { kind: 'info' }); },
    'safe-reveal': () => { PAGES.safe.reveal = !PAGES.safe.reveal; S.state = PAGES.safe.reveal ? 'revealed' : 'detail'; renderDetail(); $('[data-action="safe-reveal"]')?.focus(); },
    'safe-copy': el => { const v = DATA.vault.find(x => x.id === el.dataset.id); toast(`已复制 ${v.title}（模拟），30 秒后仅清除仍为本次复制的内容`); },
    'safe-quick-btn': () => PAGES.safe.quick(),
    'safe-new': () => toast('新建条目表单与编辑表单相同（原型略）', { kind: 'info' }),
    'safe-pw-eye': el => { const i = $('#safe-pw'); i.type = i.type === 'password' ? 'text' : 'password'; el.setAttribute('aria-label', i.type === 'password' ? '显示密码' : '隐藏密码'); },
  },
};

/* ==========================================================================
   版本 · checkpoints, diff, restore
   ========================================================================== */
PAGES.versioning = {
  title: '版本', states: ['default', 'diff', 'restore-confirm', 'empty'], file: '产品周报.md', sel: 'c2',
  files: [['产品周报.md', 4], ['设计规范.md', 2], ['huhu/journal/2026-11-05.md', 3], ['读书笔记/设计中的设计.md', 1], ['空白草稿.md', 0]],
  enter(s) { this.applyState(s); },
  applyState(s) { this.file = s === 'empty' ? '空白草稿.md' : '产品周报.md'; this.sel = 'c2'; this.diff = s === 'diff' || s === 'restore-confirm'; if (s === 'restore-confirm') setTimeout(() => this.restore(), 0); },
  panel() { return h`<div class="panel-head"><h2>版本</h2><button class="btn btn-ghost btn-icon btn-sm" aria-label="立即创建检查点">${icon('git-commit-horizontal', 'ico-sm')}</button></div><div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" placeholder="搜索文件" aria-label="搜索有历史的文件"></div></div>
    <div class="panel-body hu-scroll"><div class="tree-group">最近修改</div>${this.files.map(([f, n]) => h`<button class="nav-item" data-action="ver-file" data-f="${f}" aria-current="${this.file === f}">${icon('file-text')}<span class="truncate grow">${f.split('/').pop()}</span><span class="count">${n || ''}</span></button>`)}</div>
    <div class="panel-foot"><p class="muted" style="font-size:12px">${icon('git-branch', 'ico-sm')} main · 3 个文件待提交</p></div>`; },
  main() {
    const list = this.file === '空白草稿.md' ? [] : DATA.versions;
    const head = pageHead(this.file, { sub: list.length ? `${list.length} 个检查点` : '', actions: h`<div class="seg" role="radiogroup" aria-label="视图"><button role="radio" aria-checked="${!this.diff}" data-action="ver-mode" data-v="list">${icon('list', 'ico-sm')}<span class="hide-sm">历史</span></button><button role="radio" aria-checked="${!!this.diff}" data-action="ver-mode" data-v="diff">${icon('git-compare', 'ico-sm')}<span class="hide-sm">比较</span></button></div>` });
    if (!list.length) return h`${head}<div class="page-body"><div class="empty" style="min-height:60vh"><span class="empty-mark">${icon('history', 'ico-lg')}</span><h2>这个文件还没有历史</h2><p>本地历史按设置采样；恢复前检查点由恢复流程创建，两者分别展示。</p><button class="btn btn-secondary">${icon('git-commit-horizontal', 'ico-sm')}创建检查点</button></div></div>`;
    const timeline = h`<ol class="ver-list">${list.map(v => h`<li><button class="ver-item" data-action="ver-sel" data-id="${v.id}" aria-current="${this.sel === v.id}"><span class="ver-dot ${v.by === '手动' ? 'is-manual' : ''}"></span><span class="grow"><span class="ver-msg">${v.msg}</span><span class="ver-meta num">${v.at} · <span class="add">+${v.add}</span> <span class="del">−${v.del}</span></span></span></button></li>`)}</ol>`;
    const diff = h`<div class="diff card"><header class="card-head"><h3 class="card-title">${icon('git-compare')}今天 09:15 → 当前</h3><span class="spacer"></span><button class="btn btn-secondary btn-sm" data-action="ver-restore">${icon('undo-2', 'ico-sm')}恢复到此版本</button></header><div class="diff-body mono">
      <div class="dl ctx"><span class="ln">12</span><span>## 设计 token</span></div><div class="dl del"><span class="ln">13</span><span>- 按钮颜色沿用宿主默认强调色。</span></div><div class="dl add"><span class="ln">13</span><span>+ 按钮、选中与焦点统一使用 --hu-accent（默认墨青）。</span></div><div class="dl add"><span class="ln">14</span><span>+ 控件边界不低于 3:1，正文不低于 7:1。</span></div><div class="dl ctx"><span class="ln">15</span><span></span></div><div class="dl ctx"><span class="ln">16</span><span>## 下周计划</span></div><div class="dl del"><span class="ln">17</span><span>- 先做自动化独立详情页。</span></div><div class="dl add"><span class="ln">17</span><span>+ 自动化改为列表 + 右侧详情。</span></div></div></div>`;
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad ver ${this.diff ? 'is-diff' : ''}">${timeline}${this.diff ? diff : h`<div class="card ver-preview"><header class="card-head"><h3 class="card-title">${icon('file-text')}${DATA.versions.find(v => v.id === this.sel).msg}</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="ver-mode" data-v="diff">${icon('git-compare', 'ico-sm')}与当前比较</button><button class="btn btn-secondary btn-sm" data-action="ver-restore">恢复</button></header><div class="card-body reading" style="font-size:15px"><h3>产品周报 · 第 45 周</h3><p>本周完成了工作台设计系统的方向：暖中性的纸感底色，单一强调色，细线分隔。</p><p>自动化详情改为列表旁的右侧详情；档案二级栏改为类型到记录的目录树。</p></div></div>`}</div></div>`;
  },
  restore() { confirmDialog({ title: '恢复到“补充设计 token 小节”？', body: '当前内容会先保存为新的检查点，再用 今天 09:15 的版本替换正文。只有正文、来源叶子与恢复回执仍匹配时才可撤销；有新编辑时请比较或恢复副本。', confirm: '恢复', onConfirm: () => { S.state = 'note-history'; this.diff = false; renderMain(); toast('已恢复，原内容保存为检查点', { action: '撤销' }); } }); },
  actions: {
    'ver-file': el => { const P = PAGES.versioning; P.file = el.dataset.f; S.state = P.file === '空白草稿.md' ? 'empty' : 'note-history'; S.panelSheet = false; renderPanel(); renderMain(); },
    'ver-sel': el => { PAGES.versioning.sel = el.dataset.id; renderMain(); },
    'ver-mode': el => { PAGES.versioning.diff = el.dataset.v === 'diff'; S.state = PAGES.versioning.diff ? 'diff' : 'default'; renderMain(); },
    'ver-restore': () => PAGES.versioning.restore(),
  },
};

/* ==========================================================================
   体检 · on-demand read-only scan, limited owner repairs
   ========================================================================== */
PAGES.health = {
  title: '体检', states: ['idle', 'scanning', 'results', 'repair-plan', 'partial', 'cancelled'], progress: 0,
  enter(s) { this.applyState(s); },
  applyState(s) { clearInterval(this._t); this.progress = s === 'scanning' ? 63 : 100; if (s === 'repair-plan') setTimeout(() => this.plan(), 0); },
  start() { S.state = 'scanning'; this.progress = 0; renderMain(); clearInterval(this._t); this._t = setInterval(() => { this.progress = Math.min(100, this.progress + 9); if (S.page !== 'health') { clearInterval(this._t); return; } if (this.progress >= 100) { clearInterval(this._t); S.state = 'results'; renderMain(); toast('体检完成：检查完成'); } else this.paintProgress(); }, 220); },
  leave() { clearInterval(this._t); },
  paintProgress() { const b = $('#hp-bar'); if (b) { b.style.width = this.progress + '%'; $('#hp-num').textContent = this.progress + '%'; $$('.scan-step').forEach((el, i) => { const done = this.progress >= (i + 1) * 20; el.classList.toggle('is-done', done); el.classList.toggle('is-active', !done && this.progress >= i * 20); }); } },
  main() {
    const st = S.state, owners = ['档案', '归物', '周期笔记', '保险箱'];
    const head = pageHead('数据体检', { sub: st === 'idle' ? '上次体检 · 11月1日' : '', actions: st === 'scanning' ? h`<button class="btn btn-secondary" data-action="hc-cancel">取消</button>` : h`<button class="btn ${st === 'idle' ? 'btn-primary' : 'btn-secondary'}" data-action="hc-start">${icon('scan-search', 'ico-sm')}${st === 'idle' ? '开始体检' : '重新体检'}</button>` });
    if (st === 'idle') return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><section class="hc-hero card"><span class="hc-mark">${icon('heart-pulse', 'ico-xl')}</span><div><h2>检查库内数据是否一致</h2><p class="fg2">只读扫描档案、归物、周期笔记与保险箱状态。发现问题后由各模块给出有限修复，执行前都会先给你看计划。</p><div class="row" style="margin-top:14px"><button class="btn btn-primary" data-action="hc-start">${icon('scan-search', 'ico-sm')}开始体检</button><span class="muted" style="font-size:12px">约 10 秒 · 不会修改任何文件</span></div></div></section>
      <div class="section-title" style="margin-top:24px">检查范围</div><div class="scope-grid">${owners.map(o => h`<div class="scope"><span class="dot dot-success"></span>${o}<span class="muted">上次正常</span></div>`)}</div></div></div>`;
    if (st === 'scanning') return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow"><section class="card card-body scan"><div class="row"><span class="spinner"></span><strong>正在扫描…</strong><span class="spacer"></span><span class="num" id="hp-num">${this.progress}%</span></div><div class="progress" style="margin:12px 0 16px"><span id="hp-bar" style="width:${this.progress}%"></span></div>
      <ol class="scan-steps">${owners.map((o, i) => h`<li class="scan-step ${this.progress >= (i + 1) * 20 ? 'is-done' : this.progress >= i * 20 ? 'is-active' : ''}">${icon('circle-check', 'ico-sm')}<span>${o}</span></li>`)}</ol><p class="field-help" style="margin-top:12px">取消后，已完成的检查结果会保留。</p></section></div></div>`;
    const sevBadge = s => ({ danger: h`<span class="badge badge-danger">需处理</span>`, warning: h`<span class="badge badge-warning">建议修复</span>`, info: h`<span class="badge">提示</span>` }[s]);
    const groups = [...new Set(DATA.health.map(x => x.owner))];
    return h`${head}<div class="page-body hu-scroll"><div class="page-pad page-narrow">
      ${st === 'partial' ? h`<div class="notice notice-warning" style="margin-bottom:16px">${icon('triangle-alert')}<div><p class="notice-title">部分修复完成：成功 1 项，失败 1 项</p><p>“修复归物投影”失败：记录版本已经变化。其余修复已写入，未改动的数据保持原样。</p></div><button class="btn btn-secondary btn-sm" data-action="hc-plan">重试失败项</button></div>` : ''}
      ${st === 'cancelled' ? h`<div class="notice" style="margin-bottom:16px">${icon('circle-pause')}<span>体检已取消。已完成档案、归物两项检查，结果如下。</span><button class="btn btn-secondary btn-sm" data-action="hc-start">继续体检</button></div>` : ''}
      <div class="kpis"><div class="kpi"><span class="kpi-label">需处理</span><span class="kpi-value num" style="color:var(--hu-danger)">0</span></div><div class="kpi"><span class="kpi-label">建议修复</span><span class="kpi-value num" style="color:var(--hu-warning)">2</span></div><div class="kpi"><span class="kpi-label">提示</span><span class="kpi-value num">2</span></div><div class="kpi"><span class="kpi-label">可自动修复</span><span class="kpi-value num">2</span><button class="btn btn-primary btn-sm" style="margin-top:6px" data-action="hc-plan">预览修复计划</button></div></div>
      ${groups.filter(g => st !== 'cancelled' || ['档案', '归物'].includes(g)).map(g => h`<section class="hc-group"><div class="section-title">${g}<span class="muted">${DATA.health.filter(x => x.owner === g).length}</span></div><div class="card">${DATA.health.filter(x => x.owner === g).map(x => h`<div class="hc-item"><span class="dot dot-${x.sev === 'info' ? 'info' : x.sev}"></span><div class="grow"><p class="hc-title">${x.title}</p><p class="muted">${x.detail}</p></div>${sevBadge(x.sev)}${x.fix ? h`<button class="btn btn-ghost btn-sm" data-action="hc-plan">${x.fix}</button>` : h`<button class="btn btn-ghost btn-sm" data-action="go" data-page="${g === '保险箱' ? 'safe' : g === '周期笔记' ? 'diary' : 'archives'}">去查看</button>`}</div>`)}</div></section>`)}
    </div></div>`;
  },
  plan() {
    const fixes = DATA.health.filter(x => x.fix);
    openLayer({ kind: 'dialog', label: '修复计划', content: h`<div class="dialog-head"><div><h2>修复计划</h2><p>每项修复由对应模块执行，只改动下面列出的内容。</p></div><button class="btn btn-ghost btn-icon btn-sm" data-action="layer-close" aria-label="关闭">${icon('x', 'ico-sm')}</button></div>
      <div class="dialog-body"><ul class="plan-list">${fixes.map(x => h`<li><label class="choice"><span class="check"><input type="checkbox" checked aria-label="${x.fix}">${CHECK_SVG}</span><span class="choice-text"><span>${x.fix}</span><span class="field-help">${x.owner} · ${x.detail}</span></span></label></li>`)}</ul><div class="notice notice-info" style="margin-top:12px">${icon('info')}<span>仅重建索引或更新归物展示内容。执行后逐项显示结果及可用的恢复入口。</span></div></div>
      <div class="dialog-foot"><button class="btn btn-secondary" data-action="layer-close">取消</button><button class="btn btn-primary" data-action="hc-run">执行 ${fixes.length} 项修复</button></div>` });
  },
  actions: {
    'hc-start': () => PAGES.health.start(),
    'hc-cancel': () => { clearInterval(PAGES.health._t); S.state = 'cancelled'; renderMain(); toast('体检已取消，已完成的结果保留', { kind: 'info' }); },
    'hc-plan': () => PAGES.health.plan(),
    'hc-run': () => { closeTop(true); S.state = 'partial'; renderMain(); toast('修复完成 1 项，失败 1 项', { kind: 'error', action: '查看' }); },
  },
};

/* ==========================================================================
   宿主笔记场景 · navigator leaf + note + comments/version leaf (host leaves)
   ========================================================================== */
PAGES.notes = {
  title: '笔记（宿主）', states: ['default', 'comment-editing', 'empty'], tab: 'comments',
  scene() {
    const st = S.state;
    const tree = [['huhu', 0, 'folder-open'], ['journal', 1, 'folder'], ['档案', 1, 'folder'], ['产品周报.md', 0, 'file-text'], ['设计规范.md', 0, 'file-text'], ['读书笔记', 0, 'folder']];
    const comments = st === 'empty' ? [] : [{ who: '我', at: '今天 11:20', quote: '单一强调色', body: '默认墨青；设置里还提供靛蓝、松绿、赭石、梅紫、石墨。' }, { who: '我', at: '今天 10:02', quote: '右侧详情', body: '主区剩余不足 640px 时改为覆盖 Sheet。' }];
    return h`<div class="notes-scene"><aside class="leaf leaf-left" aria-label="导航器"><div class="leaf-head">${icon('folder', 'ico-sm')}导航器<span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="新建笔记">${icon('square-pen', 'ico-sm')}</button></div>
      <div class="panel-search" style="padding-top:8px"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" placeholder="搜索笔记" aria-label="搜索笔记"></div></div>
      <div class="tree hu-scroll" role="tree" aria-label="笔记">${tree.map(([n, l, ic]) => h`<div class="tree-row" role="treeitem" tabindex="${n === '产品周报.md' ? 0 : -1}" aria-selected="${n === '产品周报.md'}" style="--lvl:${l}"><span class="tree-twist ${ic === 'file-text' ? 'leaf' : ''}">${icon('chevron-right')}</span>${icon(ic)}<span class="tree-label">${n}</span></div>`)}</div></aside>
      <main class="editor" id="main" data-page="notes" data-state="${st}" tabindex="-1"><div class="editor-head">${icon('file-text', 'ico-sm')}<span>产品周报.md</span><span class="spacer"></span><span>阅读视图</span></div>
        <div class="editor-body hu-scroll"><article class="note reading"><h1 id="page-title">产品周报 · 第 45 周</h1><p>本周完成了工作台设计系统的方向：暖中性的纸感底色，<mark class="hl">单一强调色</mark>，细线分隔与低阴影。</p><h2>本周完成</h2><ul><li>自动化改为列表 + <mark class="hl">右侧详情</mark>，启停使用滑动开关。</li><li>档案二级栏改为“类型 → 记录”的目录树。</li><li>统一的日期字段替换浏览器原生日历。</li></ul><h2>下周计划</h2><p>把 token 落到 <code>src/ui/styles/tokens.css</code>，删除页面局部颜色。</p></article></div></main>
      <aside class="leaf leaf-right" aria-label="批注与版本"><div class="leaf-head"><div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="${this.tab === 'comments'}" data-action="nt-tab" data-v="comments">批注 <span class="count">${comments.length}</span></button><button class="tab" role="tab" aria-selected="${this.tab === 'history'}" data-action="nt-tab" data-v="history">版本</button></div></div>
        <div class="hu-scroll" style="flex:1;padding:12px">${this.tab === 'history' ? h`<ol class="ver-list">${DATA.versions.map(v => h`<li><button class="ver-item" data-action="go" data-page="versioning"><span class="ver-dot ${v.by === '手动' ? 'is-manual' : ''}"></span><span class="grow"><span class="ver-msg">${v.msg}</span><span class="ver-meta">${v.at}</span></span></button></li>`)}</ol>`
          : comments.length ? comments.map(c => h`<article class="comment card"><blockquote>${c.quote}</blockquote><p>${c.body}</p><footer class="muted">${c.who} · ${c.at}<span class="spacer"></span><button class="btn btn-ghost btn-icon btn-sm" aria-label="批注操作">${icon('ellipsis', 'ico-sm')}</button></footer></article>`) : h`<div class="empty" style="min-height:200px"><span class="empty-mark">${icon('message-square', 'ico-lg')}</span><h3>还没有批注</h3><p>在正文中选中文字后添加批注，批注单独保存，不改动笔记正文。</p></div>`}
          ${this.tab === 'comments' ? (st === 'comment-editing' ? h`<form class="comment-composer card" id="cm-form"><blockquote>细线分隔与低阴影</blockquote><textarea class="textarea" id="cm-body" autofocus placeholder="写下批注…" aria-label="批注内容"></textarea><div class="row" style="justify-content:flex-end;margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-action="cm-cancel">取消</button><button class="btn btn-primary btn-sm" type="submit">添加批注</button></div></form>` : h`<button class="btn btn-secondary btn-block" style="margin-top:8px" data-action="cm-new">${icon('plus', 'ico-sm')}添加批注</button>`) : ''}</div></aside></div>`;
  },
  mount() { const f = $('#cm-form'); f?.addEventListener('submit', e => { e.preventDefault(); S.state = 'default'; render(); toast('批注已添加'); }); f && $('#cm-body').focus(); },
  actions: {
    'nt-tab': el => { PAGES.notes.tab = el.dataset.v; render(); },
    'cm-new': () => { S.state = 'comment-editing'; render(); },
    'cm-cancel': () => { S.state = 'default'; render(); },
  },
};

/* ==========================================================================
   设置 · appearance (live), general, icons, content, search
   ========================================================================== */
const ACCENTS = [['teal', '墨青', '#2C6669'], ['indigo', '靛蓝', '#3B57A3'], ['pine', '松绿', '#356E43'], ['ochre', '赭石', '#9A4E26'], ['plum', '梅紫', '#764689'], ['graphite', '石墨', '#34312D']];
PAGES.settings = {
  title: '设置', states: ['appearance', 'appearance-dark', 'follow-obsidian', 'general', 'icons', 'content', 'search'], section: 'appearance', q: '',
  sections: [['appearance', '外观', 'palette'], ['general', '通用', 'sliders-horizontal'], ['workbench', '工作台', 'layout-grid'], ['tasks', '任务', 'list-checks'], ['archives', '档案', 'library'], ['automations', '自动化', 'workflow'], ['agent', '智能体与账号', 'bot'], ['safe', '保险箱', 'lock-keyhole'], ['notify', '通知渠道', 'bell'], ['icons', '图标', 'shapes'], ['content', '内容与受管文件', 'files'], ['about', '关于', 'info']],
  enter(s) { this.applyState(s); },
  applyState(s) {
    this.q = ''; this.section = ['general', 'icons', 'content'].includes(s) ? s : 'appearance';
    S.mode = s === 'appearance-dark' ? 'dark' : 'light'; S.source = s === 'follow-obsidian' ? 'obsidian' : 'huhu';
    if (s === 'search') this.q = '锁定';
  },
  leave() { savePrefs(); },
  panel() { return h`<div class="panel-head"><h2>设置</h2></div><div class="panel-search"><div class="input-group">${icon('search', 'ico-sm')}<input class="input" id="set-q" placeholder="搜索设置" value="${this.q}" aria-label="搜索设置"></div></div>
    <div class="panel-body hu-scroll">${this.sections.map(([id, n, ic]) => h`<button class="nav-item" data-action="set-sec" data-id="${id}" aria-current="${!this.q && this.section === id}">${icon(ic)}<span>${n}</span></button>`)}</div>`; },
  row(label, desc, control, { id = '' } = {}) { return h`<div class="set-row" ${id ? raw(`data-row="${id}"`) : ''}><div class="set-text"><span class="set-label">${label}</span>${desc ? h`<span class="set-desc">${desc}</span>` : ''}</div><div class="set-ctl">${control}</div></div>`; },
  sw(on, label) { return h`<button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-action="set-switch"></button>`; },
  main() {
    if (this.q) return this.searchView();
    const sec = this.sections.find(s => s[0] === this.section) || ['iconic','图标','shapes'];
    return h`${pageHead(sec[1], { crumb: h`<span>设置</span>${icon('chevron-right', 'ico-sm')}` })}<div class="page-body hu-scroll"><div class="page-pad settings">${this['sec_' + this.section] ? this['sec_' + this.section]() : this.sec_generic(sec)}</div></div>`;
  },
  sec_appearance() {
    const seg = (name, cur, opts) => h`<div class="seg" role="radiogroup" aria-label="${name}">${opts.map(([v, l, ic]) => h`<button role="radio" aria-checked="${cur === v}" data-action="set-pref" data-k="${name}" data-v="${v}">${ic ? icon(ic, 'ico-sm') : ''}${l}</button>`)}</div>`;
    return h`<div class="settings-grid"><div class="settings-col">
      <section class="set-section"><h2 class="set-h">主题</h2><div class="card">
        ${this.row('配色来源', 'HUHU 主题保证统一的对比度与层级；跟随 Obsidian 时改用宿主主题变量。', seg('source', S.source, [['huhu', 'HUHU 主题'], ['obsidian', '跟随 Obsidian']]))}
        ${this.row('明暗', '跟随系统时随操作系统切换。', seg('mode', S.mode, [['light', '浅色', 'sun'], ['dark', '深色', 'moon'], ['system', '跟随系统', 'monitor']]))}
        ${this.row('强调色', S.source === 'obsidian' ? '跟随 Obsidian 时使用宿主强调色。' : '用于主操作、选中与焦点。', h`<div class="swatches" role="radiogroup" aria-label="强调色">${ACCENTS.map(([v, l, c]) => h`<button class="swatch" role="radio" aria-checked="${S.accent === v}" aria-label="${l}" data-tip="${l}" data-tip-pos="bottom" data-action="set-pref" data-k="accent" data-v="${v}" style="--sw:${c}" ${S.source === 'obsidian' ? raw('disabled') : ''}></button>`)}</div>`)}
      </div>${S.source === 'obsidian' ? h`<div class="notice notice-info" style="margin-top:10px">${icon('info')}<span>当前使用 Obsidian 主题变量。若宿主主题对比度不足，HUHU 会对正文与控件边界回退到安全值。</span></div>` : ''}</section>
      <section class="set-section"><h2 class="set-h">排版与密度</h2><div class="card">
        ${this.row('界面字号', '只影响 HUHU 工作台，不改变笔记正文。', seg('uiSize', S.uiSize, [['13', '小'], ['14', '标准'], ['15', '大']]))}
        ${this.row('界面字体', '中文自动回退到系统字体。', h`<select class="select" style="width:180px" data-action-change="fontUi" aria-label="界面字体"><option value="geist" ${S.fontUi === 'geist' ? raw('selected') : ''}>Geist + 系统中文</option><option value="system" ${S.fontUi === 'system' ? raw('selected') : ''}>系统界面字体</option></select>`)}
        ${this.row('信息密度', '紧凑适合大量列表；舒适提供更大的行高与留白。', seg('density', S.density, [['compact', '紧凑'], ['comfortable', '舒适']]))}
        ${this.row('减少动效', '关闭过渡与动画；系统设置为减少动效时自动生效。', h`<button class="switch" role="switch" aria-checked="${S.motion === 'reduce'}" aria-label="减少动效" data-action="set-pref" data-k="motion" data-v="${S.motion === 'reduce' ? 'system' : 'reduce'}"></button>`)}
      </div></section>
      <section class="set-section"><h2 class="set-h">导入与恢复</h2><div class="card">${this.row('导出外观', '导出为当前格式的 JSON。', h`<button class="btn btn-secondary">${icon('download', 'ico-sm')}导出</button>`)}${this.row('恢复默认', '恢复为 HUHU 浅色 · 墨青 · 紧凑。', h`<button class="btn btn-secondary" data-action="set-reset">恢复默认</button>`)}</div></section>
    </div>
    <aside class="settings-preview" aria-label="实时预览"><div class="eyebrow" style="margin-bottom:8px">实时预览</div><div class="card preview-card"><div class="row"><strong>按钮</strong></div><div class="row" style="flex-wrap:wrap"><button class="btn btn-primary">${icon('plus')}主要操作</button><button class="btn btn-secondary">次要</button><button class="btn btn-ghost">幽灵</button></div>
      <div class="row" style="margin-top:14px"><strong>字段</strong></div><div class="input-group">${icon('search')}<input class="input" placeholder="搜索档案" aria-label="预览输入框"></div>${dateField({ id: 'pv-date', value: ymd(TODAY), label: '预览日期' })}
      <div class="row" style="margin-top:14px;justify-content:space-between"><span>启用自动化</span><button class="switch" role="switch" aria-checked="true" aria-label="预览开关" data-action="set-switch"></button></div>
      <div class="row"><div class="seg seg-sm"><button aria-pressed="true">列表</button><button aria-pressed="false">看板</button></div><span class="badge badge-accent">进行中</span><span class="badge badge-success">成功</span><span class="badge badge-danger">失败</span></div>
      <div class="list-row task-row" style="margin:10px -12px 0;cursor:default">${taskCheck({ id: 'pv1', title: '已完成的任务', done: true })}<div class="list-row-main">${taskContent({ title: '已完成的任务', note: '标题与说明划线', done: true })}</div></div>
      <div class="list-row task-row" style="margin:0 -12px;cursor:default">${taskCheck({ id: 'pv2', title: '未完成的任务', done: false })}<div class="list-row-main">${taskContent({ title: '未完成的任务', note: '截止明天', done: false })}</div></div></div></aside></div>`;
  },
  sec_general() { return h`<section class="set-section"><div class="card">${this.row('启动时打开', '打开 Obsidian 后默认进入的页面。', h`<select class="select" style="width:160px" aria-label="启动页面"><option>首页</option><option>上次的位置</option></select>`)}${this.row('周起始日', '日期选择器与日历使用。', h`<div class="seg"><button aria-pressed="true">周一</button><button aria-pressed="false">周日</button></div>`)}${this.row('日期格式', '中文界面固定使用年-月-日。', h`<span class="fg2 mono">2026-11-05</span>`)}${this.row('新建任务快捷键', '在工作台任意位置按下。', h`<span class="kbd">N</span>`)}${this.row('命令面板', '', h`<span class="row" style="gap:4px"><span class="kbd">⌘</span><span class="kbd">K</span></span>`)}${this.row('状态栏显示', '在 Obsidian 状态栏显示智能体额度与计划数。', this.sw(true, '状态栏显示'))}</div></section>`; },
  sec_icons() {
    const names = ['house', 'list-checks', 'notebook-pen', 'library', 'workflow', 'bot', 'lock-keyhole', 'history', 'heart-pulse', 'bell', 'book', 'package', 'user', 'folder', 'star', 'flag', 'tag', 'bookmark', 'calendar', 'clock', 'sparkles', 'feather', 'leaf', 'map-pin', 'wallet', 'credit-card', 'image', 'smile', 'layers', 'shapes', 'gauge', 'cpu'];
    return h`<section class="set-section"><p class="fg2" style="margin-bottom:12px">为模块、档案类型和看板选择图标。图标来自内置 Lucide 图标集。</p><div class="row" style="margin-bottom:12px"><div class="input-group search">${icon('search')}<input class="input" placeholder="搜索图标" aria-label="搜索图标" id="icon-q"></div><span class="muted" style="font-size:12px">${names.length} 个</span></div>
      <div class="icon-grid" role="radiogroup" aria-label="图标" id="icon-grid">${names.map((n, i) => h`<button class="icon-cell" role="radio" aria-checked="${i === 10}" aria-label="${n}" data-icon="${n}">${icon(n, 'ico-lg')}<span>${n}</span></button>`)}</div></section>`;
  },
  sec_content() { const files = [['huhu/', '用户内容根', '可见 · 1,284 个文件'], ['.huhu/settings.json', '设置', '隐藏 · 18 KB'], ['.huhu/dashboards/', '看板定义', '隐藏 · 3 个'], ['.huhu/automations/', '自动化定义', '隐藏 · 6 个'], ['.huhu/safe/', '加密保险箱', '隐藏 · 加密']];
    return h`<section class="set-section"><p class="fg2" style="margin-bottom:12px">HUHU 只在下面的位置读写数据。普通笔记、宿主数据和 Git 元数据保持原位。</p><div class="card">${files.map(([p, n, d]) => this.row(h`<span class="mono">${p}</span>`, `${n} · ${d}`, h`<button class="btn btn-ghost btn-sm">${icon('folder-open', 'ico-sm')}显示</button>`))}</div></section>`; },
  sec_generic() { return h``; },
  searchView() {
    const all = [['通知渠道', '站内收件箱', '所有通知都会进入收件箱。'], ['通知渠道', '系统通知', '通过操作系统通知中心推送。'], ['自动化', '失败时通知', '运行失败时发送通知。'], ['通用', '状态栏显示', '在 Obsidian 状态栏显示智能体额度与计划数。'], ['保险箱', '复制后清除剪贴板', '30 秒后仅清除未被替换的内容。']];
    const q = this.q.trim(); const hits = all.filter(r => r.join('').includes(q));
    return h`${pageHead(`搜索“${q}”`, { crumb: h`<span>设置</span>${icon('chevron-right', 'ico-sm')}`, sub: `${hits.length} 项` })}<div class="page-body hu-scroll"><div class="page-pad settings">${hits.length ? h`<div class="card">${hits.map(([s, l, d]) => this.row(raw(mark(l, q)), raw(`${esc(s)} · ${mark(d, q)}`), this.sw(true, l)))}</div>` : h`<div class="empty"><p>没有匹配的设置</p></div>`}</div></div>`;
  },
  mountPanel() { $('#set-q')?.addEventListener('input', e => { this.q = e.target.value; S.state = this.q ? 'search' : this.section; renderMain(); }); },
  mount() {
    mountDateFields($('#main'));
    $('[data-action-change="fontUi"]')?.addEventListener('change', e => { S.fontUi = e.target.value; savePrefs(); applyTheme(); });
    $('#icon-grid')?.addEventListener('click', e => { const b = e.target.closest('[data-icon]'); if (!b) return; $$('#icon-grid [data-icon]').forEach(x => x.setAttribute('aria-checked', x === b)); toast(`已选择图标 ${b.dataset.icon}`); });
    $('#icon-q')?.addEventListener('input', e => { const q = e.target.value.trim(); $$('#icon-grid [data-icon]').forEach(b => { b.hidden = q && !b.dataset.icon.includes(q); }); });
  },
  actions: {
    'set-sec': el => { const P = PAGES.settings; P.section = el.dataset.id; P.q = ''; S.state = ['general', 'icons', 'content'].includes(P.section) ? P.section : P.section === 'appearance' ? 'appearance' : 'general'; S.panelSheet = false; renderPanel(); renderMain(); },
    'set-pref': el => { const k = el.dataset.k, v = el.dataset.v; S[k] = v; if (k === 'mode') S.state = v === 'dark' ? 'appearance-dark' : 'appearance'; if (k === 'source') S.state = v === 'obsidian' ? 'follow-obsidian' : 'appearance'; savePrefs(); const sc = $('#main .page-body')?.scrollTop; render(); const b = $('#main .page-body'); if (b) b.scrollTop = sc; $(`[data-k="${k}"][data-v="${v}"],[data-k="${k}"]`)?.focus(); },
    'set-switch': el => { el.setAttribute('aria-checked', el.getAttribute('aria-checked') !== 'true'); },
    'set-reset': () => confirmDialog({ title: '恢复默认外观？', body: '主题、强调色、字号与密度会恢复为默认值。', confirm: '恢复默认', onConfirm: () => { Object.assign(S, { mode: 'light', accent: 'teal', source: 'huhu', density: 'compact', uiSize: '14', motion: 'system', fontUi: 'geist' }); savePrefs(); S.state = 'appearance'; render(); toast('已恢复默认外观'); } }),
  },
};

/* ---------- Revision 2: domain-complete surface templates ---------- */
const routeButton = (pageId,state,label,primary=false) => h`<button class="btn ${primary?'btn-primary':'btn-secondary'}" data-action="go" data-page="${pageId}" data-state="${state}">${label}</button>`;
const field = (label,value='',kind='text') => h`<label>${label}${kind==='textarea'?h`<textarea class="textarea" aria-label="${label}">${value}</textarea>`:h`<input class="input" type="${kind}" aria-label="${label}" value="${value}">`}</label>`;
const selectField = (label,options) => h`<label>${label}<select class="select" aria-label="${label}">${options.map(x=>h`<option>${x}</option>`)}</select></label>`;
const formCard = (title,description,fields,action='保存') => h`<section class="card"><header class="card-head"><h2 class="card-title">${title}</h2></header><div class="card-body audit-fields"><p class="fg2">${description}</p>${fields}<button class="btn btn-primary" data-action="demo-save">${action}</button><span class="field-help" role="status" data-save-receipt></span></div></section>`;
const statePage = (title,body,actions='') => h`${pageHead(title)}<div class="page-body hu-scroll"><div class="page-pad audit-state">${body}${actions?h`<div class="row" style="margin-top:16px;flex-wrap:wrap">${actions}</div>`:''}</div></div>`;
ACTIONS['demo-save'] = el => {const receipt=el.parentElement.querySelector('[data-save-receipt]');if(receipt)receipt.textContent='保存中…';el.disabled=true;setTimeout(()=>{el.disabled=false;if(receipt)receipt.textContent='已保存（演示数据，仅当前原型会话）';},300);};

// The complete registry shares four presentation families; configuration remains domain-owned.
const WIDGETS = [
 ['clock','时钟','时间','时区'],['calendar','日历','时间','显示范围'],['lunar','农历','时间','显示节气'],['year-progress','年进度','时间','年份'],['countdown','倒计时','时间','目标日期'],['anniversary','纪念日','时间','名称与日期'],['pomodoro','番茄钟','时间','专注与休息时长'],
 ['habit','习惯','记录','习惯名称与周期'],['expense','记账','记录','金额与币种'],['reading','阅读','记录','书籍与阅读进度'],['usage','智能体用量','统计','账号与统计范围'],['quick-actions','快捷操作','导航','命令'],['skills','技能','导航','技能目录'],['fileSearch','文件搜索','导航','搜索范围'],['recent','最近文件','导航','显示数量'],['nav-recent','最近导航','导航','显示数量'],['nav-shortcuts','导航快捷方式','导航','库内路径'],['album','相册','媒体','目录与切换间隔'],
 ['section-memo','收件箱与闪念','记录','捕捉与处理'],['section-todo','任务','记录','筛选与完成状态'],['section-sticky','便笺','记录','正文'],['section-projects','项目笔记','内容','来源目录'],['section-library','资料库','内容','来源与筛选'],['section-folder','文件夹','内容','库内目录'],['section-dataview','Dataview 查询','内容','查询文本'],['section-pm','项目看板','内容','列与卡片'],['section-pipeline','流程看板','内容','阶段与条目'],['section-skills','技能列表','导航','技能目录'],['section-calendar','日历分区','时间','周期与任务来源'],['section-rss','RSS','媒体','订阅地址'],['section-images','图片','媒体','库内目录'],['section-videos','视频','媒体','库内目录']
];
const homeMain=PAGES.home.main,homeMount=PAGES.home.mount;
PAGES.home.states.push('widgets','widget-config','inbox','widget-error');
PAGES.home.main=function(){
 if(S.state==='widgets')return statePage('添加小组件',h`<p class="fg2">时间、记录、导航、内容和媒体使用统一卡片；按需要添加到当前看板。</p><div class="audit-grid">${WIDGETS.map(([id,name,group,setting])=>h`<article class="card"><div class="card-body"><span class="badge">${group}</span><h3>${name}</h3><p class="fg2">${setting}</p><button class="btn btn-secondary" data-action="widget-config" data-id="${id}">配置并添加</button></div></article>`)}</div>`);
 if(S.state==='widget-config'){const w=WIDGETS.find(x=>x[0]===this.widgetId)||WIDGETS[0];return statePage(w[1],formCard('配置'+w[1],'选择内容后保存到当前看板；尺寸只列出该组件支持的档位。',h`${field(w[3],w[0]==='clock'?'Asia/Shanghai':'')}${selectField('大小',['默认'])}`, '添加到看板'),routeButton('home','widgets','返回目录'));}
 if(S.state==='inbox')return statePage('收件箱与闪念',h`<div class="card"><div class="card-body"><h2>今天捕捉</h2><p>整理一份下周的阅读清单</p><div class="row">${routeButton('tasks','default','查看任务')}${routeButton('archives','default','查看档案')}</div></div></div>${formCard('快速捕捉','内容存入首页收件箱；系统通知和智能体投递另有入口。',field('内容','','textarea'),'捕捉')}`);
 if(S.state==='widget-error')return statePage('组件暂不可用',h`<div class="notice notice-error"><p>Dataview 未启用或查询失败。保留配置与其他组件，检查依赖后重试。</p></div>`,routeButton('home','widgets','选择组件'));
 return homeMain.call(this);
};
PAGES.home.mount=function(){if(['widgets','widget-config','inbox','widget-error'].includes(S.state))return;homeMount.call(this);};
PAGES.home.actions['widget-config']=el=>{PAGES.home.widgetId=el.dataset.id;setState('widget-config');};
// Keep existing deep layout editing, expose the complete catalogue from every home state.
const hp=PAGES.home.panel;PAGES.home.panel=function(){return h`${hp?.call(this)||''}<div class="panel-foot">${routeButton('home','widgets','全部小组件')}${routeButton('home','inbox','收件箱与闪念')}</div>`;};

const agentExtras=['inbox','inbox-compose','inbox-failed','accounts','skills','commands','backup','spaces','unavailable'];
PAGES.agent.states.push(...agentExtras);
const agentMain=PAGES.agent.main,agentApply=PAGES.agent.applyState;
PAGES.agent.applyState=function(s){agentApply.call(this,s);if(agentExtras.includes(s))this.view=s;};
PAGES.agent.main=function(){
 const st=this.view;
 if(st==='unavailable')return statePage('智能体仅在桌面端可用',h`<p>当前设备不能启动本机 CLI 或终端进程。已有内容不会被修改。</p>`);
 if(st==='inbox'||st==='inbox-failed')return statePage('智能体收件箱',h`<p class="fg2">投递到指定空间或会话，与系统通知独立。</p>${st==='inbox-failed'?h`<div class="notice notice-error">投递失败：目标会话已结束。请选择仍有效的收件人后重试。</div>`:''}<div class="card"><div class="card-body"><h2>请检查今天的任务清单</h2><p>收件人：个人空间 / 设计评审 · 待处理</p>${routeButton('agent','blocked','定位目标会话')}</div></div>`,routeButton('agent','inbox-compose','新建投递',true));
 if(st==='inbox-compose')return statePage('新建投递',formCard('投递给智能体','发送前核对收件人；发送后显示投递结果。',h`${selectField('空间',['个人空间','项目空间'])}${selectField('会话',['设计评审','当前空间收件箱'])}${field('消息','','textarea')}`,'投递'),routeButton('agent','inbox','取消'));
 const settings={accounts:['账号与 CLI','账号登录与切换使用现有系统 CLI，HUHU 不保存登录密码。',h`${selectField('CLI',['Claude Code','Codex'])}${field('账号名称','个人')}`],skills:['技能','浏览现有技能，核对来源与作用范围后启用。',field('技能目录','')],commands:['快捷命令','命令作为明确的终端输入，仅在用户触发时发送。',h`${field('名称','运行测试')}${field('命令','pnpm test')}`],backup:['配置备份','备份与恢复前显示范围和差异；恢复须确认覆盖项。',field('备份目录','')],spaces:['空间','空间决定会话的工作目录与展示分组。',h`${field('空间名称','个人空间')}${field('工作目录','')}`]};
 if(settings[st]){const [title,desc,fields]=settings[st];return statePage(title,formCard(title,desc,fields));}
 return agentMain.call(this);
};
const ap=PAGES.agent.panel;PAGES.agent.panel=function(){return h`${ap.call(this)}<div class="panel-foot">${[['spaces','空间'],['skills','技能'],['commands','快捷命令'],['backup','备份']].map(([s,l])=>routeButton('agent',s,l))}</div>`;};

// Git workspace and independent note revision review have different snapshots and actions.
const verOldMain=PAGES.versioning.main,verApply=PAGES.versioning.applyState;
const gitStates=['changes','history','compare','setup','clone','remote','author','conflict','unavailable','revision-review','stale-review','binary'];
PAGES.versioning.states=['changes',...PAGES.versioning.states.filter(s=>s!=='default'),'note-history',...gitStates.filter(s=>s!=='changes')];
PAGES.versioning.applyState=function(s){verApply.call(this,s);this.mode=s;};
const verPanel=PAGES.versioning.panel;
PAGES.versioning.panel=function(){return h`<div class="panel-head"><h2>版本管理</h2></div><div class="panel-body hu-scroll">${[['changes','更改'],['history','提交历史'],['compare','比较版本'],['note-history','笔记历史'],['setup','仓库接入']].map(([s,l])=>h`<button class="nav-item" data-action="go" data-page="versioning" data-state="${s}" aria-current="${S.state===s?'page':'false'}">${icon('git-branch')}<span>${l}</span></button>`)}</div>`;};
PAGES.versioning.main=function(){
 const st=S.state;
 if(['note-history','diff','restore-confirm','empty'].includes(st))return verOldMain.call(this);
 const tabs=h`<div class="audit-tabs">${[['changes','更改'],['history','历史'],['compare','比较']].map(([s,l])=>routeButton('versioning',s,l))}</div>`;
 if(st==='unavailable')return statePage('Git 当前不可用',h`<p>版本管理只在桌面端运行。桌面上未发现 Git 时，请检查可执行文件路径后重新检测。</p>`,routeButton('settings','versioning','版本设置'));
 if(st==='setup')return statePage('连接 Git 仓库',h`<p>当前库尚未初始化。仅接受当前库或库内指定目录自身的独立仓库。</p>${formCard('创建仓库','在所选目录初始化 Git；不会自动配置认证或开启同步。',field('库内仓库目录',''),'创建仓库')}`,routeButton('versioning','clone','克隆已有仓库'));
 if(st==='clone')return statePage('克隆已有仓库',formCard('仓库和目标','目标必须是当前库之外的新目录或空目录。失败或取消后显示临时路径；不会切换当前库。',h`${field('仓库地址','https://example.com/team/notes.git')}${field('目标绝对路径','')}`,'确认并克隆'),routeButton('versioning','setup','取消'));
 if(st==='remote'||st==='author')return statePage(st==='remote'?'添加远端':'设置作者',formCard(st==='remote'?'远端地址':'本仓库作者','只写入本仓库配置；认证由系统 Git 凭据管理器提供。',st==='remote'?field('远端 URL',''):h`${field('姓名','')}${field('邮箱','','email')}`));
 if(st==='conflict')return statePage('同步暂停：存在冲突',h`<div class="notice notice-warning">请先处理冲突。查看差异不会自动合并或覆盖文件。</div><div class="card card-body"><p class="mono">产品周报.md</p>${routeButton('versioning','compare','查看差异')}</div>`);
 if(st==='binary')return statePage('此文件不能显示文本差异',h`<p>二进制文件；保留文件元信息，不截断成可恢复的文本。</p>`);
 if(st==='stale-review')return statePage('当前内容已变化',h`<div class="notice notice-warning">比较会话仍显示首次捕获的快照。刷新后重新核对差异与恢复目标。</div>`,routeButton('versioning','revision-review','刷新当前版本'));
 const diff=h`<section class="card"><header class="card-head"><h2 class="card-title">产品周报.md</h2></header><div class="card-body"><p class="mono">${st==='changes'?'index → 工作树快照':st==='revision-review'?'所选历史 → 打开比较时的编辑器快照':'版本 A → 版本 B'}</p><div class="diff-body mono"><div class="dl del">− 旧的段落内容</div><div class="dl add">+ 更新后的段落内容</div></div></div></section>`;
 if(st==='revision-review')return statePage('版本对比 · 产品周报',h`<p class="fg2">这是独立比较标签。来源笔记保持打开；恢复不重置 HEAD 或 index。</p>${diff}`,h`${routeButton('versioning','restore-confirm','恢复为当前笔记',true)}${routeButton('versioning','stale-review','查看内容变化状态')}`);
 const navigation=st==='changes'?h`<section class="card card-body"><h2>未暂存 · 2</h2><button class="nav-item" data-action="demo-select">产品周报.md</button><button class="nav-item" data-action="demo-select">设计规范.md</button><h2>已暂存 · 1</h2><button class="nav-item" data-action="demo-select">huhu/journal/2026-11-05.md</button><div class="row"><button class="btn btn-secondary" data-action="git-stage">暂存所选文件</button><button class="btn btn-secondary" data-action="git-unstage">取消暂存</button></div></section>`:st==='history'?h`<section class="card card-body">${selectField('分支 / 引用',['main','origin/main'])}<h2>提交记录</h2><button class="nav-item" data-action="demo-select">补充本周计划 · 8d741ac</button><button class="nav-item" data-action="demo-select">整理资料 · 19f79cd</button>${selectField('父提交',['第一父提交','第二父提交（合并提交）'])}</section>`:formCard('比较端点','读取明确版本，不切换分支或修改暂存区。',h`${field('版本 A','HEAD~1')}${field('版本 B','HEAD')}`,'比较');
 return h`${pageHead('Git · 个人知识库',{sub:'main',actions:h`${routeButton('versioning','remote','远端')}${routeButton('versioning','author','作者')}`})}${tabs}<div class="page-body hu-scroll"><div class="page-pad"><div class="audit-grid">${navigation}${diff}</div>${st==='changes'?h`<div style="margin-top:16px">${formCard('提交已暂存文件','未暂存内容不会混入此提交。推送和拉取显示独立运行结果。',field('提交说明','','textarea'),'提交已暂存')}<div class="row" style="margin-top:16px"><button class="btn btn-secondary" data-action="git-pull">拉取</button><button class="btn btn-secondary" data-action="git-push">推送</button>${routeButton('versioning','conflict','查看冲突状态')}</div></div>`:''}</div></div>`;
};
PAGES.versioning.actions['ver-mode']=el=>{PAGES.versioning.diff=el.dataset.v==='diff';S.state=PAGES.versioning.diff?'diff':'note-history';renderMain();};
for(const [key,label] of [['git-stage','已暂存所选文件'],['git-unstage','已取消暂存'],['git-pull','拉取完成'],['git-push','推送完成']])ACTIONS[key]=()=>toast(label+'（原型模拟）');
ACTIONS['demo-select']=el=>{el.parentElement.querySelectorAll('.nav-item').forEach(b=>b.removeAttribute('aria-current'));el.setAttribute('aria-current','true');};

// Health API scopes: archives, belongings, periodic, safe. Repairs are finite owner commands.
DATA.health=[{owner:'档案',sev:'warning',title:'索引需要重建',detail:'索引与当前记录不一致',fix:'重建索引'},{owner:'归物',sev:'warning',title:'投影需要刷新',detail:'重新核对归物记录并更新展示内容',fix:'修复归物投影'},{owner:'周期笔记',sev:'info',title:'模板配置待检查',detail:'只读检查发现配置缺失',fix:null},{owner:'保险箱',sev:'info',title:'已锁定',detail:'未请求解锁，不读取明文',fix:null}];
PAGES.health.states.push('unavailable','stale-plan');
const hm=PAGES.health.main;
PAGES.health.main=function(){if(S.state==='unavailable')return statePage('检查能力不可用',h`<p>提供检查的模块未加载。结果标记为不可用，不显示为通过。</p>`);if(S.state==='stale-plan')return statePage('修复计划已过期',h`<p>记录版本已变化，请重新扫描后生成计划。</p>`,routeButton('health','idle','重新扫描'));return hm.call(this);};

// Settings retain current product groupings and fields, not generic per-module switches.
const SETTING_GROUPS={
 dashboard:['工作台','layout-grid', [['看板名称','个人'],['看板文件','.huhu/dashboards/个人.json'],['捕捉路径','huhu/inbox/'],['记账币种','CNY'],['最近文件数量','10']]],
 editor:['批注','message-square', [['批注作者','我'],['高亮已解决批注','开启']]],
 navigator:['导航与周期笔记','notebook-pen', [['布局','双栏'],['方向','左右'],['排序字段','修改时间'],['分组方式','日期'],['标题行数','2'],['日期格式','YYYY-MM-DD HH:mm']]],
 terminal:['智能体','bot', [['用量刷新间隔','60'],['终端字体大小','13']]],
 iconic:['图标','shapes', [['图标集','Lucide'],['图标颜色','跟随强调色']]],
 contacts:['档案','library', [['档案根目录','huhu/archives'],['最大列数','4']]],
 automation:['自动化','workflow', []],
 versioning:['版本管理','git-branch', [['Git 可执行文件路径',''],['库内仓库目录',''],['提交说明模板',''],['合并方式','merge'],['本地历史采样间隔（分钟）','2'],['本地历史保留（天）','30'],['本地历史配额（MiB）','100']]],
 safe:['保险箱','lock-keyhole', [['空闲锁定','20 分钟'],['切换库时锁定','开启'],['关闭时锁定','开启'],['退出时锁定','强制开启']]]
};
const setApply=PAGES.settings.applyState;
PAGES.settings.sections=[['appearance','外观','palette'],['general','通用','sliders-horizontal'],...Object.entries(SETTING_GROUPS).map(([id,[name,ic]])=>[id,name,ic]),['content','内容与受管文件','files'],['about','关于','info']];
PAGES.settings.states.push(...Object.keys(SETTING_GROUPS),'about','onboarding','device-choice','editor-appearance');
PAGES.settings.applyState=function(s){setApply.call(this,s);if(SETTING_GROUPS[s]||['about','onboarding','device-choice','editor-appearance'].includes(s))this.section=s;};
PAGES.settings.sec_generic=function(sec){const group=SETTING_GROUPS[sec[0]];if(!group)return h`<div class="card card-body"><h2>HUHU</h2><p>Obsidian 中的个人工作台。</p><p>组件与依赖许可见第三方声明。</p></div>`;if(sec[0]==='automation')return h`<div class="audit-tabs">${routeButton('automations','default','管理自动化')}${routeButton('notifications','default','打开通知收件箱')}</div>`;return h`${formCard(group[0],'修改后保存；失败时保留输入，方便重试。',group[2].map(renderSettingField))}${sec[0]==='terminal'?h`<div class="audit-tabs">${['accounts','skills','commands','backup'].map(s=>routeButton('agent',s,({accounts:'账号',skills:'技能',commands:'快捷命令',backup:'备份'})[s]))}</div>`:''}`;};
PAGES.settings.actions['set-sec']=el=>go('settings',{state:el.dataset.id});
const setMain=PAGES.settings.main;
PAGES.settings.main=function(){
 if(S.state==='onboarding')return statePage('欢迎使用 HUHU',h`<div class="card card-body"><h2>选择要使用的功能</h2><p>工作台、任务与档案保存在当前库。智能体、保险箱和版本管理按设备能力提供入口。</p>${selectField('界面语言',['简体中文','English'])}</div>`,h`${routeButton('settings','device-choice','设置此设备',true)}${routeButton('home','default','稍后设置')}`);
 if(S.state==='device-choice')return statePage('此设备上的功能',formCard('设备配置','桌面工具需要本机能力；移动端不会启动桌面进程。',selectField('设备类型',['桌面设备','移动设备']),'继续'));
 if(S.state==='editor-appearance')return statePage('笔记正文外观',formCard('编辑器与阅读设置','正文外观单独设置。工作台的纸 / 墨切换不改变笔记正文。',h`${selectField('正文方案',['跟随 Obsidian','现有正文方案'])}${field('正文字体','系统字体')}${field('正文大小','16')}`));
 return setMain.call(this);
};
const appearance=PAGES.settings.sec_appearance;PAGES.settings.sec_appearance=function(){return h`${appearance.call(this)}<div class="audit-tabs">${routeButton('settings','editor-appearance','笔记正文外观')}</div>`;};
// Safe recovery and initialization are explicit surfaces; no real secrets are used.
PAGES.safe.states.push('initialize','corrupt','recovery','unavailable','edit');
const safeMain=PAGES.safe.main,safeApply=PAGES.safe.applyState;
PAGES.safe.applyState=function(s){safeApply.call(this,s);if(['initialize','corrupt','recovery','unavailable'].includes(s)){this.unlocked=false;this.sel=null;}};
PAGES.safe.main=function(){
 if(S.state==='unavailable')return statePage('保险箱当前不可用',h`<p>此设备不支持当前保险箱能力；密文保持原样。</p>`);
 if(S.state==='corrupt')return statePage('无法读取保险箱',h`<div class="notice notice-error">密文格式或校验异常。不会创建新库覆盖现有文件。</div>`,routeButton('safe','recovery','查看恢复入口'));
 if(S.state==='recovery')return statePage('恢复保险箱',formCard('选择恢复来源','先验证格式与密码，再确认替换范围；失败保留原密文。',field('备份文件',''),'验证备份'));
 if(S.state==='initialize')return statePage('创建保险箱',formCard('设置主密码','请妥善保存主密码。这里只演示表单，不创建密文。',h`${field('主密码','','password')}${field('确认主密码','','password')}`,'创建'));
 if(S.state==='edit')return statePage('编辑条目',formCard('凭据条目','保存失败保留编辑内容；锁定会清除明文并关闭编辑器。',h`${field('标题','演示账号')}${field('用户名','demo')}${field('密码','','password')}${field('网址','https://example.com')}`));
 return safeMain.call(this);
};
PAGES.safe.actions['safe-new']=()=>go('safe',{state:'edit'});
// Trees have one tab stop; pointer/arrow navigation changes the roving item.
const normalizeTrees=()=>document.querySelectorAll('[role="tree"]').forEach(tree=>{const rows=[...tree.querySelectorAll('[role="treeitem"]')];const current=rows.find(x=>x===document.activeElement)||rows.find(x=>x.getAttribute('aria-selected')==='true')||rows[0];for(const row of rows){row.tabIndex=row===current?0:-1;if(!row.querySelector('[data-action*="expand"],[data-action*="toggle"]')&&!row.dataset.type)row.removeAttribute('aria-expanded');}});
new MutationObserver(normalizeTrees).observe(document.getElementById('workbench'),{childList:true,subtree:true});
document.addEventListener('focusin',e=>{const row=e.target.closest?.('[role="treeitem"]'),tree=row?.closest('[role="tree"]');if(tree)for(const x of tree.querySelectorAll('[role="treeitem"]'))x.tabIndex=x===row?0:-1;});


PAGES.home.actions['add-widget']=()=>go('home',{state:'widgets'});
PAGES.settings.searchView=function(){
 const q=this.q.trim();const hits=Object.entries(SETTING_GROUPS).flatMap(([id,[name,ic,rows]])=>rows.map(([label,value])=>({id,name,label,value}))).filter(x=>(x.name+x.label).includes(q));
 return statePage('搜索“'+q+'”',h`<p class="fg2">${hits.length} 项设置</p><div class="card">${hits.map(x=>this.row(x.label,x.name,routeButton('settings',x.id,'打开设置')))}</div>`);
};
// Actual field types are reused in settings templates; values are demo values, never defaults.
const renderSettingField=([label,value])=>['开启','关闭','强制开启'].includes(value)?selectField(label,value==='强制开启'?['强制开启']:['开启','关闭']):/^\d+$/.test(value)?field(label,value,'number'):field(label,value);
PAGES.settings.states=PAGES.settings.states.filter(x=>x!=='icons');
PAGES.settings.sec_iconic=PAGES.settings.sec_icons;

// Settings use the shared label/help | control row; narrow containers stack the same row.
const settingControl=([label,value])=>{
 const options=({'合并方式':['merge','rebase'],'布局':['双栏','单栏'],'方向':['左右','上下'],'排序字段':['修改时间','创建时间','名称'],'分组方式':['日期','文件夹','无'],'空闲锁定':['5 分钟','20 分钟','60 分钟','自定义','永不']})[label] || (['开启','关闭','强制开启'].includes(value)?(value==='强制开启'?['强制开启']:['开启','关闭']):null);
 return options?h`<select class="select" aria-label="${label}" style="width:200px;max-width:100%">${options.map(v=>h`<option ${v===value?raw('selected'):''}>${v}</option>`)}</select>`:h`<input class="input" aria-label="${label}" type="${/^\d+$/.test(value)?'number':'text'}" value="${value}" style="width:240px;max-width:100%">`;
};
const settingsFallback=PAGES.settings.sec_generic;
PAGES.settings.sec_generic=function(sec){const g=SETTING_GROUPS[sec[0]];if(!g||sec[0]==='automation')return settingsFallback.call(this,sec);return h`<section class="set-section"><div class="card">${g[2].map(pair=>this.row(pair[0],'',settingControl(pair)))}</div><div class="row" style="margin-top:16px"><button class="btn btn-primary" data-action="demo-save">保存</button><span class="field-help" role="status" data-save-receipt></span></div>${sec[0]==='terminal'?h`<div class="audit-tabs">${['accounts','skills','commands','backup'].map(s=>routeButton('agent',s,({accounts:'账号',skills:'技能',commands:'快捷命令',backup:'备份'})[s]))}</div>`:''}</section>`;};
// Added widgets have a visible in-session receipt on the board; no vault persistence is claimed.
const oldWidget=PAGES.home.widget;
PAGES.home.widget=function(w,i,loading){if(!w.startsWith('catalog:'))return oldWidget.call(this,w,i,loading);const entry=WIDGETS.find(x=>x[0]===w.slice(8));return h`<section class="card widget w-5" aria-label="${entry[1]}"><header class="card-head"><h3 class="card-title">${entry[1]}</h3><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="w-remove" data-i="${i}">移除</button></header><div class="card-body"><p>${entry[3]}已配置</p><p class="field-help">此处为组件布局预览。</p><button class="btn btn-secondary" data-action="widget-config" data-id="${entry[0]}">编辑配置</button></div></section>`;};
const demoSave=ACTIONS['demo-save'];ACTIONS['demo-save']=el=>{if(S.page==='home'&&S.state==='widget-config'){const id=PAGES.home.widgetId||'clock';const widget='catalog:'+id;if(!PAGES.home.widgets.includes(widget))PAGES.home.widgets.push(widget);go('home',{state:'default'});toast('已添加到当前看板（演示）');return;}demoSave(el);};


/* ---------- Git diff 工作区（生产：@pierre/diffs；原型只示意其布局与交互合同） ---------- */
Object.assign(ICONS,{
 'git-branch':['path d="M15 6a9 9 0 0 0-9 9V3"','circle cx="18" cy="6" r="3"','circle cx="6" cy="18" r="3"'],
 'git-merge':['circle cx="18" cy="18" r="3"','circle cx="6" cy="6" r="3"','path d="M6 21V9a9 9 0 0 0 9 9"'],
 'rows-2':['rect width="18" height="18" x="3" y="3" rx="2"','path d="M3 12h18"'],
 'text-wrap':['path d="m16 16-3 3 3 3"','path d="M3 12h14.5a1 1 0 0 1 0 7H13"','path d="M3 19h6"','path d="M3 5h18"'],
 'arrow-left-right':['path d="M8 3 4 7l4 4"','path d="M4 7h16"','path d="m16 21 4-4-4-4"','path d="M20 17H4"'],
 'chevrons-up-down':['path d="m7 15 5 5 5-5"','path d="m7 9 5-5 5 5"'],
});
// 词级差异用 [-删除-] / {+新增+} 标记；ctx 为未改动行。行号由数据给出，不在原型里重算。
const GDIFF={
 files:{
  'docs/产品周报.md':{status:'M',lang:'markdown',hunks:[
   {head:'@@ -10,7 +10,9 @@ ## 本周进展',gapBefore:9,lines:[
    ['ctx',10,10,'## 本周进展'],['ctx',11,11,''],
    ['del',12,null,'1. 任务页完成态[-样式不统一-]，看板与列表各有一套。'],
    ['add',null,12,'1. 任务页完成态{+统一为 TaskContent：标题划线、日期不划线+}。'],
    ['ctx',13,13,'2. 档案树支持键盘导航。'],
    ['del',14,null,'3. 自动化详情会替换列表。'],
    ['add',null,14,'3. 自动化改为{+列表 + 右详情+}，切换时列表不卸载。'],
    ['add',null,15,'4. 日期字段统一为 DateField，{+非法日期保留为草稿+}。'],
    ['ctx',15,16,''],['ctx',16,17,'## 下周计划']]},
   {head:'@@ -31,4 +33,5 @@ ## 风险',gapBefore:14,lines:[
    ['ctx',31,33,'## 风险'],
    ['del',32,null,'1. 第三方主题会改变[-层级-]。'],
    ['add',null,34,'1. 第三方主题会改变{+层级与对比度；跟随模式下不足时整对回退+}。'],
    ['add',null,35,'2. {+多窗口 Portal 必须挂到所属 Document。+}'],
    ['ctx',33,36,'']]}],tail:22},
  'docs/设计规范.md':{status:'M',lang:'markdown',hunks:[
   {head:'@@ -4,4 +4,4 @@ # 颜色',gapBefore:3,lines:[['ctx',4,4,'# 颜色'],['del',5,null,'强调色：[-跟随宿主-]'],['add',null,5,'强调色：{+墨青 #2C6669，可选 6 种+}'],['ctx',6,6,'']]}],tail:40},
  'huhu/journal/2026-11-05.md':{status:'A',lang:'markdown',hunks:[
   {head:'@@ -0,0 +1,3 @@',gapBefore:0,lines:[['add',null,1,'# 2026-11-05 周四'],['add',null,2,''],['add',null,3,'今天把 Git 差异换成 @pierre/diffs。']]}],tail:0},
  'assets/封面.png':{status:'M',binary:true,hunks:[]},
  '资料/旧会议纪要.md':{status:'R',from:'资料/会议纪要.md',lang:'markdown',hunks:[
   {head:'@@ -1,2 +1,2 @@',gapBefore:0,lines:[['del',1,null,'# [-会议纪要-]'],['add',null,1,'# {+旧会议纪要（已归档）+}'],['ctx',2,2,'']]}],tail:12},
  '项目/冲突示例.md':{status:'U',lang:'markdown',hunks:[
   {head:'@@@ 冲突 1 / 1 @@@',gapBefore:2,lines:[['ctx',3,3,'## 截止日期'],['ours',4,null,'截止：11 月 20 日（当前分支）'],['theirs',null,4,'截止：11 月 22 日（origin/main）'],['ctx',5,5,'']]}],tail:6},
 },
 groups:[['conflict','冲突',['项目/冲突示例.md']],['unstaged','未暂存',['docs/产品周报.md','docs/设计规范.md','assets/封面.png']],['staged','已暂存',['huhu/journal/2026-11-05.md','资料/旧会议纪要.md']]],
 commits:[
  {id:'WT',short:'工作树',msg:'未提交的更改',who:'',at:'现在',lane:0,refs:[],files:['docs/产品周报.md','docs/设计规范.md','assets/封面.png']},
  {id:'8d741ac',short:'8d741ac',msg:'补充本周计划与风险',who:'王同学',at:'今天 09:15',lane:0,refs:['HEAD','main'],files:['docs/产品周报.md']},
  {id:'5be20f1',short:'5be20f1',msg:'合并 origin/main：设计规范更新',who:'王同学',at:'昨天 21:40',lane:0,merge:true,refs:[],files:['docs/设计规范.md','docs/产品周报.md']},
  {id:'a91c3d2',short:'a91c3d2',msg:'设计规范：确定强调色',who:'协作者',at:'昨天 18:02',lane:1,refs:['origin/main'],files:['docs/设计规范.md']},
  {id:'19f79cd',short:'19f79cd',msg:'整理资料：归档旧会议纪要',who:'王同学',at:'11-03 10:20',lane:0,refs:['v0.0.3'],files:['资料/旧会议纪要.md']},
  {id:'0c44e9b',short:'0c44e9b',msg:'新建今日日记',who:'王同学',at:'11-02 08:05',lane:0,refs:[],files:['huhu/journal/2026-11-05.md']},
 ],
};
const gvLayout=()=>S.width==='narrow'?'unified':GV.layout;
const GV={file:'docs/产品周报.md',layout:'split',wrap:true,word:true,expanded:{},sel:null,a:'8d741ac',b:'WT',commit:'8d741ac',collapsed:{},staged:{},reverted:{}};
const gvStat=f=>{const d=GDIFF.files[f];let a=0,r=0;d.hunks.forEach(hk=>hk.lines.forEach(l=>{if(l[0]==='add'||l[0]==='theirs')a++;if(l[0]==='del'||l[0]==='ours')r++;}));return{a,r};};
const gvWord=(t,show)=>raw(esc(t).replace(/\[-(.*?)-\]/g,show?'<mark class="dw dw-del">$1</mark>':'$1').replace(/\{\+(.*?)\+\}/g,show?'<mark class="dw dw-add">$1</mark>':'$1'));
const GV_STATUS={M:['已修改','M'],A:['新增','A'],D:['删除','D'],R:['重命名','R'],U:['冲突','!']};
function gvSelected(side,n){const s=GV.sel;return !!(s&&s.side===side&&n>=Math.min(s.from,s.to)&&n<=Math.max(s.from,s.to));}
function gvNum(side,n,file){if(n==null)return h`<span class="dn" aria-hidden="true"></span>`;return h`<button class="dn" data-action="gv-line" data-side="${side}" data-n="${n}" data-f="${file}" aria-label="${side==='new'?'新':'旧'}文件第 ${n} 行，选择此行；按住 Shift 扩展选择" aria-pressed="${gvSelected(side,n)}">${n}</button>`;}
function gvCell(type,text,side){const sr={add:'新增：',del:'删除：',ours:'当前分支：',theirs:'传入：',ctx:''}[type]||'';return h`<span class="dc dc-${type}"><span class="sr-only">${sr}</span><span class="dmark" aria-hidden="true">${type==='add'||type==='theirs'?'+':type==='del'||type==='ours'?'−':' '}</span><span class="dt">${gvWord(text,GV.word)}</span></span>`;}
function gvRowsUnified(file,hk){return hk.lines.map(([t,o,n,x])=>h`<div class="drow is-${t} ${gvSelected('new',n)||gvSelected('old',o)?'is-sel':''}">${gvNum('old',o,file)}${gvNum('new',n,file)}${gvCell(t,x)}</div>`);}
function gvRowsSplit(file,hk){
 const out=[];const L=hk.lines;let i=0;
 while(i<L.length){const t=L[i][0];
  if(t==='ctx'){const [,o,n,x]=L[i];out.push(h`<div class="drow split ${gvSelected('new',n)?'is-sel':''}">${gvNum('old',o,file)}${gvCell('ctx',x)}${gvNum('new',n,file)}${gvCell('ctx',x)}</div>`);i++;continue;}
  const dels=[],adds=[];while(i<L.length&&(L[i][0]==='del'||L[i][0]==='ours')){dels.push(L[i]);i++;}while(i<L.length&&(L[i][0]==='add'||L[i][0]==='theirs')){adds.push(L[i]);i++;}
  for(let k=0;k<Math.max(dels.length,adds.length);k++){const d=dels[k],a=adds[k];out.push(h`<div class="drow split ${a&&gvSelected('new',a[2])?'is-sel':''}">${d?gvNum('old',d[1],file):h`<span class="dn is-empty" aria-hidden="true"></span>`}${d?gvCell(d[0],d[3]):h`<span class="dc dc-empty" aria-hidden="true"></span>`}${a?gvNum('new',a[2],file):h`<span class="dn is-empty" aria-hidden="true"></span>`}${a?gvCell(a[0],a[3]):h`<span class="dc dc-empty" aria-hidden="true"></span>`}</div>`);}
 }
 return out;
}
function gvSep(file,hi,count,where){if(!count)return'';const key=`${file}#${hi}#${where}`;if(GV.expanded[key])return h`<div class="dsep is-open"><span class="dsep-line">已展开 ${count} 行未改动内容（演示：生产由 loadDiffFiles 按需读取全文）</span></div>`;return h`<div class="dsep"><button class="dsep-btn" data-action="gv-expand" data-k="${key}" aria-label="展开 ${count} 行未改动内容">${icon('chevrons-up-down','ico-sm')}<span>${count} 行未改动</span></button></div>`;}
function gvHunkActions(file,hi,mode){
 if(mode==='commit'||mode==='compare')return'';
 const key=`${file}#${hi}`;
 if(GV.staged[key])return h`<span class="dh-done">${icon('check','ico-sm')}此块已暂存</span><button class="btn btn-ghost btn-sm" data-action="gv-hunk" data-op="unstage" data-k="${key}">撤回</button>`;
 if(GV.reverted[key])return h`<span class="dh-done">${icon('undo-2','ico-sm')}此块已还原</span>`;
 const staged=GDIFF.groups.find(g=>g[0]==='staged')[2].includes(file);
 if(GDIFF.files[file].status==='U')return h`<button class="btn btn-secondary btn-sm" data-action="gv-conflict" data-v="ours">采用当前</button><button class="btn btn-secondary btn-sm" data-action="gv-conflict" data-v="theirs">采用传入</button><button class="btn btn-ghost btn-sm" data-action="gv-conflict" data-v="both">两者都保留</button>`;
 return staged?h`<button class="btn btn-ghost btn-sm" data-action="gv-hunk" data-op="unstage" data-k="${key}">取消暂存此块</button>`:h`<button class="btn btn-secondary btn-sm" data-action="gv-hunk" data-op="stage" data-k="${key}">${icon('plus','ico-sm')}暂存此块</button><button class="btn btn-ghost btn-sm" data-action="gv-hunk" data-op="revert" data-k="${key}">还原此块</button>`;
}
function gvFile(file,{mode='changes',collapsible=false}={}){
 const d=GDIFF.files[file];const {a,r}=gvStat(file);const st=GV_STATUS[d.status];const collapsed=collapsible&&GV.collapsed[file];
 const head=h`<header class="dfile-head">${collapsible?h`<button class="btn btn-ghost btn-icon btn-sm" data-action="gv-collapse" data-f="${file}" aria-expanded="${!collapsed}" aria-label="${collapsed?'展开':'折叠'} ${file}">${icon(collapsed?'chevron-right':'chevron-down','ico-sm')}</button>`:''}<span class="dstatus is-${d.status}" title="${st[0]}">${st[1]}<span class="sr-only">${st[0]}</span></span><span class="dname mono">${d.from?h`<span class="dfrom">${d.from}</span> ${icon('arrow-right','ico-sm')} `:''}${file}</span><span class="spacer"></span>${d.binary?h`<span class="badge">二进制</span>`:h`<span class="dstat num"><span class="add">+${a}</span> <span class="del">−${r}</span></span>`}</header>`;
 if(collapsed)return h`<section class="dfile is-collapsed" aria-label="${file} 差异">${head}</section>`;
 if(d.binary)return h`<section class="dfile" aria-label="${file} 差异">${head}<div class="dempty">${icon('image','ico-lg')}<p>二进制文件不显示文本差异。大小 182 KB → 176 KB；可在系统中打开两个版本。</p></div></section>`;
 const body=d.hunks.map((hk,hi)=>h`${gvSep(file,hi,hk.gapBefore,'before')}<div class="dhunk" role="group" aria-label="改动块 ${hi+1}：${hk.head}"><div class="dhunk-head"><span class="mono dhunk-range">${hk.head}</span><span class="spacer"></span>${gvHunkActions(file,hi,mode)}</div><div class="dgrid ${gvLayout()==='split'?'is-split':'is-unified'}">${gvLayout()==='split'?gvRowsSplit(file,hk):gvRowsUnified(file,hk)}</div></div>`);
 return h`<section class="dfile" aria-label="${file} 差异">${head}${body}${gvSep(file,'end',d.tail,'after')}</section>`;
}
function gvToolbar(extra=''){
 return h`<div class="dtoolbar" role="toolbar" aria-label="差异显示">
  <div class="seg" role="radiogroup" aria-label="布局"><button role="radio" aria-checked="${gvLayout()==='split'}" data-action="gv-layout" data-v="split" ${S.width==='narrow'?raw('disabled title="宽度不足 600，自动堆叠"'):''}>${icon('columns-2','ico-sm')}<span class="hide-sm">分栏</span></button><button role="radio" aria-checked="${gvLayout()==='unified'}" data-action="gv-layout" data-v="unified">${icon('rows-2','ico-sm')}<span class="hide-sm">堆叠</span></button></div>
  <button class="btn btn-ghost btn-sm" data-action="gv-toggle" data-k="wrap" aria-pressed="${GV.wrap}">${icon('text-wrap','ico-sm')}换行</button>
  <button class="btn btn-ghost btn-sm" data-action="gv-toggle" data-k="word" aria-pressed="${GV.word}">${icon('highlighter','ico-sm')}词级高亮</button>
  <span class="spacer"></span>${extra}
  <button class="btn btn-ghost btn-icon btn-sm" data-action="gv-jump" data-d="-1" aria-label="上一处改动">${icon('chevron-up','ico-sm')}</button><button class="btn btn-ghost btn-icon btn-sm" data-action="gv-jump" data-d="1" aria-label="下一处改动">${icon('chevron-down','ico-sm')}</button>
 </div>`;
}
function gvSelBar(){const s=GV.sel;if(!s)return'';const a=Math.min(s.from,s.to),b=Math.max(s.from,s.to);return h`<div class="dselbar" role="status"><span>${s.f.split('/').pop()} · ${s.side==='new'?'新':'旧'} L${a}${b>a?`–L${b}`:''}</span><button class="btn btn-ghost btn-sm" data-action="gv-copy">${icon('copy','ico-sm')}复制所选行</button><button class="btn btn-ghost btn-sm" data-action="gv-copylink">${icon('link','ico-sm')}复制位置</button><button class="btn btn-ghost btn-icon btn-sm" data-action="gv-clearsel" aria-label="清除行选择">${icon('x','ico-sm')}</button></div>`;}
const gvCommit=id=>GDIFF.commits.find(c=>c.id===id);
function gvEndpoint(role,id){const c=gvCommit(id);return h`<span class="dend is-${role}"><span class="dend-role">${role.toUpperCase()}</span><span class="dhash">${c?c.short:'—'}</span><span class="dend-msg truncate">${c?c.msg:'未选择'}</span></span>`;}
function gvCompareFiles(){const A=GDIFF.commits.findIndex(c=>c.id===GV.a),B=GDIFF.commits.findIndex(c=>c.id===GV.b);const lo=Math.min(A,B),hi=Math.max(A,B);const set=new Set();GDIFF.commits.slice(lo,hi).forEach(c=>c.files.forEach(f=>set.add(f)));return [...set];}
function gvCompareBar(){
 const files=gvCompareFiles();let a=0,r=0;files.forEach(f=>{const s=gvStat(f);a+=s.a;r+=s.r;});
 return h`<div class="dcompare" role="region" aria-label="比较端点">${gvEndpoint('a',GV.a)}<button class="btn btn-ghost btn-icon btn-sm" data-action="gv-swap" aria-label="交换 A 与 B">${icon('arrow-left-right','ico-sm')}</button>${gvEndpoint('b',GV.b)}<span class="dcompare-sum num">${files.length} 个文件 · <span class="add">+${a}</span> <span class="del">−${r}</span></span><span class="spacer"></span><button class="btn btn-ghost btn-sm" data-action="gv-pick-wt">B = 工作树</button></div>`;
}
function gvGraph(){
 return h`<ol class="dgraph" aria-label="提交历史，选择一条查看其改动；按 A / B 设定比较端点">${GDIFF.commits.map(c=>{const isA=GV.a===c.id,isB=GV.b===c.id;return h`<li class="dcommit ${GV.commit===c.id?'is-current':''} ${isA||isB?'is-endpoint':''}">
  <span class="dlane" aria-hidden="true"><span class="dlane-line"></span>${c.lane?h`<span class="dlane-line is-side"></span>`:''}<span class="dlane-dot ${c.id==='WT'?'is-wt':''} ${c.merge?'is-merge':''} ${c.lane?'is-side':''}"></span></span>
  <button class="dcommit-main" data-action="gv-commit" data-id="${c.id}" aria-current="${GV.commit===c.id}"><span class="dcommit-msg">${c.msg}</span><span class="dcommit-meta"><span class="dhash">${c.short}</span>${c.who?h` · ${c.who}`:''} · ${c.at}${c.refs.map(r=>h` <span class="dref ${r==='HEAD'?'is-head':r.startsWith('v')?'is-tag':''}">${r}</span>`)}</span></button>
  <span class="dcommit-ab" role="group" aria-label="${c.short} 设为比较端点"><button class="dab" data-action="gv-set" data-role="a" data-id="${c.id}" aria-pressed="${isA}" aria-label="设为 A：${c.short}">A</button><button class="dab" data-action="gv-set" data-role="b" data-id="${c.id}" aria-pressed="${isB}" aria-label="设为 B：${c.short}">B</button></span>
 </li>`;})}</ol>`;
}
function gvCompareView(){const files=gvCompareFiles();if(GV.a===GV.b)return h`<div class="dempty">${icon('git-compare','ico-lg')}<p>A 与 B 相同，没有差异。请在左侧历史中选择另一个端点。</p></div>`;return h`<div class="dstack" aria-label="多文件差异（生产为 CodeView 虚拟列表）">${files.map(f=>gvFile(f,{mode:'compare',collapsible:true}))}</div>`;}
function gvChanges(){
 const st=S.state;const list=h`<nav class="dfiles" aria-label="更改的文件">${GDIFF.groups.map(([k,label,fs])=>h`<div class="dfiles-group"><div class="tree-group">${label} · ${fs.length}</div>${fs.map(f=>{const d=GDIFF.files[f],s=gvStat(f);return h`<button class="dfile-item" data-action="gv-file" data-f="${f}" aria-current="${GV.file===f}"><span class="dstatus is-${d.status}">${GV_STATUS[d.status][1]}<span class="sr-only">${GV_STATUS[d.status][0]}</span></span><span class="truncate grow"><span class="dfile-base">${f.split('/').pop()}</span><span class="dfile-dir">${f.includes('/')?f.slice(0,f.lastIndexOf('/')):''}</span></span>${d.binary?'':h`<span class="dstat num"><span class="add">+${s.a}</span> <span class="del">−${s.r}</span></span>`}</button>`;})}</div>`)}
  <div class="dfiles-foot"><label class="sr-only" for="gv-msg">提交说明</label><textarea id="gv-msg" class="textarea" placeholder="提交说明（仅提交已暂存内容）" rows="2"></textarea><button class="btn btn-primary" data-action="git-commit" style="width:100%">${icon('git-commit-horizontal','ico-sm')}提交已暂存 · 2</button><div class="row"><button class="btn btn-secondary btn-sm grow" data-action="git-pull">拉取</button><button class="btn btn-secondary btn-sm grow" data-action="git-push">推送</button></div></div></nav>`;
 const label=GDIFF.groups.find(g=>g[2].includes(GV.file))[0];
 const endpoint={conflict:'当前分支 ⇄ 传入（合并冲突）',unstaged:'index → 工作树',staged:'HEAD → index'}[label];
 return h`<div class="dwork">${list}<div class="dmain"><div class="dmain-sub"><span class="badge">${endpoint}</span><span class="muted" style="font-size:12px">只读浏览不改 index；暂存/还原是显式操作</span></div>${gvToolbar()}${gvSelBar()}<div class="dscroll ${GV.wrap?'is-wrap':''}">${gvFile(GV.file,{mode:'changes'})}</div></div></div>`;
}
function gvHistory(){
 const c=gvCommit(GV.commit);const compare=S.state==='compare';
 const right=compare?h`${gvCompareBar()}${gvToolbar()}${gvSelBar()}<div class="dscroll ${GV.wrap?'is-wrap':''}">${gvCompareView()}</div>`
  :h`<div class="dcommit-sum"><h2>${c.msg}</h2><p class="muted"><span class="dhash">${c.short}</span>${c.who?` · ${c.who}`:''} · ${c.at}${c.merge?' · 合并提交，相对第一父提交':''}</p>${c.merge?h`<div class="seg" role="radiogroup" aria-label="比较的父提交"><button role="radio" aria-checked="true">第一父提交</button><button role="radio" aria-checked="false">第二父提交</button></div>`:''}</div>${gvToolbar(h`<button class="btn btn-secondary btn-sm" data-action="gv-compare-from" data-id="${c.id}">${icon('git-compare','ico-sm')}与工作树比较</button>`)}${gvSelBar()}<div class="dscroll ${GV.wrap?'is-wrap':''}"><div class="dstack">${c.files.map(f=>gvFile(f,{mode:'commit',collapsible:c.files.length>1}))}</div></div>`;
 return h`<div class="dwork is-history"><div class="dfiles"><div class="dfiles-filter">${selectField('分支 / 引用',['全部分支','main','origin/main','v0.0.3'])}<p class="field-help">点一条提交查看其改动；用每行的 A / B 选择任意两个版本比较。浏览不会切换分支。</p></div>${gvGraph()}</div><div class="dmain">${right}</div></div>`;
}
const verMain2=PAGES.versioning.main;
PAGES.versioning.states=[...new Set([...PAGES.versioning.states,'diff-unified','compare-same','hunk-staged','line-select','conflict-file','large'])];
const verApply2=PAGES.versioning.applyState;
PAGES.versioning.applyState=function(s){verApply2.call(this,s);Object.assign(GV,{layout:s==='diff-unified'?'unified':'split',sel:s==='line-select'?{f:'docs/产品周报.md',side:'new',from:12,to:14}:null,staged:s==='hunk-staged'?{'docs/产品周报.md#0':true}:{},reverted:{},expanded:{},collapsed:{},file:s==='conflict-file'?'项目/冲突示例.md':'docs/产品周报.md',a:s==='compare-same'?'8d741ac':'19f79cd',b:s==='compare-same'?'8d741ac':'WT',commit:'8d741ac'});};
PAGES.versioning.main=function(){
 const st=S.state;
 const gitView={changes:'changes','diff-unified':'changes','hunk-staged':'changes','line-select':'changes','conflict-file':'changes',history:'history',compare:'history','compare-same':'history'}[st];
 if(st==='large')return statePage('差异过大，暂不渲染',h`<div class="notice notice-info">数据/表格.csv 有 48 万行改动，超过单文件渲染上限。只显示统计：<span class="num">+412,300 −80,112</span>。</div>`,h`<button class="btn btn-secondary" data-action="demo-select">仍然渲染（可能卡顿，可取消）</button>${routeButton('versioning','changes','返回更改')}`);
 if(!gitView)return verMain2.call(this);
 const tabs=h`<div class="dtabs" role="tablist" aria-label="Git 视图">${[['changes','更改',5],['history','提交历史',0],['compare','比较 A ⇄ B',0]].map(([s,l,n])=>h`<button role="tab" class="dtab" data-action="go" data-page="versioning" data-state="${s}" aria-selected="${gitView==='changes'?s==='changes':(st==='compare'||st==='compare-same')?s==='compare':s==='history'}">${l}${n?h`<span class="count">${n}</span>`:''}</button>`)}</div>`;
 return h`${pageHead('Git · 个人知识库',{sub:h`${icon('git-branch','ico-sm')} main · 领先 1 · 落后 0`,actions:h`${routeButton('versioning','remote','远端')}${routeButton('versioning','author','作者')}`})}${tabs}<div class="page-body dpage">${gitView==='changes'?gvChanges():gvHistory()}</div>`;
};
Object.assign(PAGES.versioning.actions,{
 'gv-file':el=>{GV.file=el.dataset.f;GV.sel=null;renderMain();$(`[data-action="gv-file"][data-f="${CSS.escape(GV.file)}"]`)?.focus();},
 'gv-layout':el=>{GV.layout=el.dataset.v;renderMain();$(`[data-action="gv-layout"][data-v="${GV.layout}"]`)?.focus();},
 'gv-toggle':el=>{GV[el.dataset.k]=!GV[el.dataset.k];renderMain();$(`[data-action="gv-toggle"][data-k="${el.dataset.k}"]`)?.focus();},
 'gv-expand':el=>{GV.expanded[el.dataset.k]=true;renderMain();},
 'gv-collapse':el=>{GV.collapsed[el.dataset.f]=!GV.collapsed[el.dataset.f];renderMain();$(`[data-action="gv-collapse"][data-f="${CSS.escape(el.dataset.f)}"]`)?.focus();},
 'gv-line':(el,e)=>{const n=+el.dataset.n,side=el.dataset.side,f=el.dataset.f;GV.sel=(e?.shiftKey&&GV.sel&&GV.sel.side===side&&GV.sel.f===f)?{...GV.sel,to:n}:{f,side,from:n,to:n};renderMain();$(`[data-action="gv-line"][data-side="${side}"][data-n="${n}"]`)?.focus();},
 'gv-clearsel':()=>{GV.sel=null;renderMain();},
 'gv-copy':()=>toast('已复制所选行（演示）'),
 'gv-copylink':()=>toast('已复制位置：docs/产品周报.md#L12-L14（演示）'),
 'gv-hunk':el=>{const k=el.dataset.k,op=el.dataset.op;if(op==='revert'){confirmDialog({title:'还原此改动块？',body:'工作树中这一块会恢复为 index 中的内容。其他改动块不受影响；还原前会创建恢复检查点。',confirm:'还原此块',danger:true,onConfirm:()=>{GV.reverted[k]=true;renderMain();toast('已还原 1 个改动块',{action:'撤销',onAction:()=>{delete GV.reverted[k];renderMain();}});}});return;}if(op==='stage'){GV.staged[k]=true;toast('已暂存 1 个改动块');}else{delete GV.staged[k];toast('已取消暂存');}renderMain();},
 'gv-conflict':el=>toast({ours:'已采用当前分支版本（演示，生产由 UnresolvedFile 写回）',theirs:'已采用传入版本（演示）',both:'已保留两者（演示）'}[el.dataset.v]),
 'gv-commit':el=>{GV.commit=el.dataset.id;GV.sel=null;if(S.state!=='history'){S.state='history';}renderMain();$(`[data-action="gv-commit"][data-id="${el.dataset.id}"]`)?.focus();},
 'gv-set':el=>{GV[el.dataset.role]=el.dataset.id;S.state='compare';renderMain();$(`[data-action="gv-set"][data-role="${el.dataset.role}"][data-id="${el.dataset.id}"]`)?.focus();},
 'gv-swap':()=>{[GV.a,GV.b]=[GV.b,GV.a];renderMain();$('[data-action="gv-swap"]')?.focus();},
 'gv-pick-wt':()=>{GV.b='WT';renderMain();},
 'gv-compare-from':el=>{GV.a=el.dataset.id;GV.b='WT';S.state='compare';renderMain();},
 'gv-jump':el=>{const hs=$$('.dhunk');if(!hs.length)return;const cur=hs.findIndex(x=>x.classList.contains('is-focus'));const next=Math.max(0,Math.min(hs.length-1,cur+(+el.dataset.d)));hs.forEach(x=>x.classList.remove('is-focus'));hs[next].classList.add('is-focus');hs[next].setAttribute('tabindex','-1');hs[next].focus();hs[next].scrollIntoView({block:'nearest'});},
});
ACTIONS['git-commit']=()=>toast('已提交 2 个已暂存文件（演示）');

// 笔记历史：时间线任选 A/B 两点比较；本地采样、手动检查点、恢复前检查点分别标注。
const NV={a:'c2',b:'now'};
const nvList=()=>[{id:'now',at:'打开比较时',msg:'当前编辑器快照',by:'当前'},...DATA.versions];
const nvKind=v=>v.by==='当前'?h`<span class="badge">当前</span>`:v.by==='手动'?h`<span class="badge badge-accent">手动检查点</span>`:h`<span class="badge">本地采样</span>`;
function noteDiffView(){
 const list=nvList();const A=list.find(v=>v.id===NV.a),B=list.find(v=>v.id===NV.b);
 const timeline=h`<ol class="dgraph" aria-label="笔记历史；用 A / B 选择任意两点比较">${list.map(v=>h`<li class="dcommit ${NV.a===v.id||NV.b===v.id?'is-endpoint':''}"><span class="dlane" aria-hidden="true"><span class="dlane-line"></span><span class="dlane-dot ${v.id==='now'?'is-wt':''} ${v.by==='手动'?'is-merge':''}"></span></span><span class="dcommit-main"><span class="dcommit-msg">${v.msg}</span><span class="dcommit-meta">${v.at} ${nvKind(v)}${v.add!=null?h` <span class="dstat num"><span class="add">+${v.add}</span> <span class="del">−${v.del}</span></span>`:''}</span></span><span class="dcommit-ab" role="group" aria-label="${v.msg} 设为比较端点"><button class="dab" data-role="a" data-action="nv-set" data-id="${v.id}" aria-pressed="${NV.a===v.id}" aria-label="设为 A：${v.at}">A</button><button class="dab" data-role="b" data-action="nv-set" data-id="${v.id}" aria-pressed="${NV.b===v.id}" aria-label="设为 B：${v.at}">B</button></span></li>`)}</ol>`;
 const bar=h`<div class="dcompare" role="region" aria-label="比较端点"><span class="dend is-a"><span class="dend-role">A</span><span class="dhash">${A.at}</span><span class="dend-msg truncate">${A.msg}</span></span><button class="btn btn-ghost btn-icon btn-sm" data-action="nv-swap" aria-label="交换 A 与 B">${icon('arrow-left-right','ico-sm')}</button><span class="dend is-b"><span class="dend-role">B</span><span class="dhash">${B.at}</span><span class="dend-msg truncate">${B.msg}</span></span><span class="spacer"></span>${NV.a!=='now'?h`<button class="btn btn-secondary btn-sm" data-action="ver-restore">${icon('undo-2','ico-sm')}恢复为 A</button>`:''}</div>`;
 const body=NV.a===NV.b?h`<div class="dempty">${icon('git-compare','ico-lg')}<p>A 与 B 相同，没有差异。</p></div>`:gvFile('docs/产品周报.md',{mode:'compare'});
 return h`${pageHead('产品周报.md',{sub:'笔记历史 · 与 Git 提交历史独立',actions:h`<div class="seg" role="radiogroup" aria-label="视图"><button role="radio" aria-checked="false" data-action="ver-mode" data-v="list">${icon('list','ico-sm')}<span class="hide-sm">历史</span></button><button role="radio" aria-checked="true" data-action="ver-mode" data-v="diff">${icon('git-compare','ico-sm')}<span class="hide-sm">比较</span></button></div>`})}<div class="page-body dpage"><div class="dwork is-history"><div class="dfiles">${timeline}</div><div class="dmain">${bar}${gvToolbar()}${gvSelBar()}<div class="dscroll ${GV.wrap?'is-wrap':''}">${body}</div></div></div></div>`;
}
const verMain3=PAGES.versioning.main;
PAGES.versioning.main=function(){if(S.state==='diff')return noteDiffView();return verMain3.call(this);};
Object.assign(PAGES.versioning.actions,{
 'nv-set':el=>{NV[el.dataset.role]=el.dataset.id;renderMain();$(`[data-action="nv-set"][data-role="${el.dataset.role}"][data-id="${el.dataset.id}"]`)?.focus();},
 'nv-swap':()=>{[NV.a,NV.b]=[NV.b,NV.a];renderMain();$('[data-action="nv-swap"]')?.focus();},
});

/* ---------- Boot ---------- */
(function boot() {
  buildProtoControls();
  const hash = location.hash.slice(1).split('/');
  if (hash[0] && PAGES[hash[0]]) { if (hash[0] === 'notes') { S.scene = 'notes'; S.state = hash[1] || 'default'; } else { S.page = hash[0]; S.state = hash[1] || PAGES[hash[0]].states[0]; (PAGES[hash[0]].enter || PAGES[hash[0]].applyState)?.call(PAGES[hash[0]],S.state); } }
  render();
  document.documentElement.classList.add('is-ready');
})();
