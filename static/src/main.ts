import Vue from "vue";
import WhiteboardComponent from './components/WhiteboardComponent.js';

Vue.component('whiteboard-component', WhiteboardComponent);

new Vue({
    el: '#app',
    template: '<whiteboard-component></whiteboard-component>',
});