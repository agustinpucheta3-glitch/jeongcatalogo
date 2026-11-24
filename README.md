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
data/codigos.json  códigos de descuento (los lee la función de Netlify)
netlify/functions/ función que valida los códigos de descuento
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

## Códigos de descuento

En el carrito hay un campo "¿Tenés un código de descuento?". Los códigos se cargan en
`data/codigos.json` y los valida una función de Netlify (`netlify/functions/descuento.mjs`),
así nadie puede ver la lista desde el navegador.

```json
[
  {
    "codigo": "MAYORISTA10",
    "tipo": "porcentaje",
    "valor": 10,
    "activo": true,
    "vence": "2026-12-01T23:59:00-03:00",
    "compra_minima": null
  }
]
```

- `tipo`: `"porcentaje"` (valor = % de descuento) o `"monto"` (valor = pesos a descontar).
- `activo`: `false` lo desactiva (después de publicar).
- `vence` (opcional): fecha y hora límite, en horario argentino (`-03:00`). Pasada esa hora el
  código deja de funcionar y el carrito avisa que venció. Sin este campo no vence nunca.
  Para un código de 2 días: la fecha y hora de carga + 48 hs (ej. cargado el 24/11 a las 10:00
  → `2026-11-26T10:00:00-03:00`).
- `compra_minima` (opcional): pedido mínimo para usarlo, o `null`.
- El descuento se aplica sobre el valor completo del pedido (preventa incluida); el envío no se
  descuenta. El mínimo mayorista de $250.000 se mide **antes** del descuento.
- No cuenta cuántas veces se usó: cualquier cliente puede usarlo las veces que quiera mientras no
  venza.
- El código queda escrito en el mensaje de WhatsApp para poder verificarlo.
- Para agregar o sacar códigos hay que publicar los cambios (Netlify tarda 1-2 minutos). Si la
  función fallara, el pedido se puede enviar igual, sin descuento.

## Número de WhatsApp

Está al principio de `js/app.js`, en la constante `WHATSAPP_NUMBER`.

## Desarrollo local

Es un sitio 100% estático (HTML/CSS/JS sin build). Para verlo en tu
compu antes de subir cambios, basta con abrir `index.html` en el
navegador, o correr cualquier servidor estático simple sobre esta
carpeta.
