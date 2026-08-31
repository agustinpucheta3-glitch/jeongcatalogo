# jeong — Catálogo mayorista

Sitio de catálogo mayorista de skincare coreano. Sin backend: el
cliente arma su pedido y lo envía por WhatsApp para coordinar stock
y pago.

## Estructura

```
index.html        estructura de la página (no hace falta tocarlo casi nunca)
css/styles.css     todos los estilos (colores, tipografías, layout)
js/catalog.js      EL CATÁLOGO DE PRODUCTOS — acá se agregan/editan productos
js/app.js          la lógica del sitio (carrito, panel de detalle, WhatsApp)
images/            fotos de los productos
```

## Cómo agregar o editar un producto

Abrí `js/catalog.js`. Arriba del archivo hay instrucciones detalladas
del formato. En resumen: cada producto es un bloque como este,
dentro de su categoría:

```js
{
  key: "nombre-unico-sin-espacios",
  name: "Nombre del producto",
  size: "50 ml",
  price: 15000,
  img: "images/nombre-del-archivo.jpg",
  benefit: "Para qué sirve.",
  skin: "Para qué tipo de piel.",
  ingredients: "Ingredientes principales.",
  modo: "Cómo se usa."
}
```

Pasos:
1. Subí la foto del producto a la carpeta `images/`.
2. Copiá un bloque `{ ... }` de un producto parecido dentro de
   `js/catalog.js` y cambiá los datos.
3. Guardá, subí los cambios a GitHub (`git add`, `git commit`,
   `git push`) y Netlify actualiza el sitio solo, en un par de minutos.

## Número de WhatsApp

Está al principio de `js/app.js`, en la constante `WHATSAPP_NUMBER`.

## Desarrollo local

Es un sitio 100% estático (HTML/CSS/JS sin build). Para verlo en tu
compu antes de subir cambios, basta con abrir `index.html` en el
navegador, o correr cualquier servidor estático simple sobre esta
carpeta.
