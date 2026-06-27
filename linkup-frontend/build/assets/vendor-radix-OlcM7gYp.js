import{r as O}from"./vendor-misc-BVDkzKSx.js";var _={exports:{}},p={};/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var y;function R(){if(y)return p;y=1;var t=O(),i=Symbol.for("react.element"),u=Symbol.for("react.fragment"),r=Object.prototype.hasOwnProperty,n=t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,x={key:!0,ref:!0,__self:!0,__source:!0};function c(s,e,l){var o,f={},a=null,m=null;l!==void 0&&(a=""+l),e.key!==void 0&&(a=""+e.key),e.ref!==void 0&&(m=e.ref);for(o in e)r.call(e,o)&&!x.hasOwnProperty(o)&&(f[o]=e[o]);if(s&&s.defaultProps)for(o in e=s.defaultProps,e)f[o]===void 0&&(f[o]=e[o]);return{$$typeof:i,type:s,key:a,ref:m,props:f,_owner:n.current}}return p.Fragment=u,p.jsx=c,p.jsxs=c,p}var d;function v(){return d||(d=1,_.exports=R()),_.exports}var b=v();function j(t,i){var u={};for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&i.indexOf(r)<0&&(u[r]=t[r]);if(t!=null&&typeof Object.getOwnPropertySymbols=="function")for(var n=0,r=Object.getOwnPropertySymbols(t);n<r.length;n++)i.indexOf(r[n])<0&&Object.prototype.propertyIsEnumerable.call(t,r[n])&&(u[r[n]]=t[r[n]]);return u}export{j as _,b as j};
