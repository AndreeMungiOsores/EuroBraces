# EuroBraces Center — sitio web

Sitio de una sola página, HTML/CSS/JS sin dependencias ni build.

## Ver el sitio

Abre `index.html` en el navegador. Para que el mapa de Google cargue correctamente,
conviene servirlo por HTTP en vez de abrirlo como archivo:

```bash
python -m http.server 5599 --directory site
```

Luego entra a `http://localhost:5599`.

## Estructura

```
index.html      todo el contenido
css/style.css   sistema visual (colores, tipografía, secciones)
js/main.js      nav, comparador antes/después, mitos, galería
img/            recortes tomados de las piezas gráficas originales
```

## Dónde editar lo que más cambia

| Qué | Dónde |
|---|---|
| Teléfono / WhatsApp | busca `986186192` en `index.html` (enlaces `wa.me` y `tel:`) |
| Dirección y horarios | sección `<!-- UBICACIÓN -->` en `index.html` |
| Servicios | lista `<ol class="serv__list">` |
| Motivos de consulta y sus fotos | `<ul class="diag__list">` + el objeto `CASES` en `js/main.js`; las imágenes son `img/ba-<clave>-antes.jpg` y `-despues.jpg` |
| Colores y tipografías | bloque `:root` al inicio de `css/style.css` |

## Notas

- Las imágenes de `img/` se recortaron de los posts de Instagram de la marca.
- El par "antes/después" de **mordida abierta** procede de un caso acreditado a
  Clínica Manzanera en la pieza original; el crédito se muestra bajo el comparador.
  Si no hay permiso de uso, reemplaza `ba-mordida-antes.jpg` y `ba-mordida-despues.jpg`
  por un caso propio y borra la clave `c` de `mordida` en `js/main.js`.
- Las fotos de pacientes son reconocibles: conviene tener su consentimiento por escrito
  para uso en web.
