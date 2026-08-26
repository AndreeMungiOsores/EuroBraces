# SEO — EuroBraces Center

Estado del sitio tras la optimización, y qué hacer para publicarlo en Google Search Console.

---

## 1. Qué se implementó

### Archivos nuevos

| Archivo | Para qué sirve |
|---|---|
| `robots.txt` | Permite el rastreo, bloquea `/admin/`, declara el sitemap y autoriza a los bots de IA (AI Overviews, ChatGPT, Perplexity). |
| `sitemap.xml` | Las 3 URLs indexables + sitemap de imágenes (fotos de casos y antes/después). |
| `404.html` | Página de error con enlaces internos, marcada `noindex, follow`. |
| `site.webmanifest` | Nombre, iconos y colores para instalación en móvil. |
| `img/og-cover.jpg` | Imagen 1200×630 para WhatsApp, Facebook, LinkedIn y X. |
| `img/og-cover-square.jpg` | Variante 1080×1080. |
| `js/seo-casos.js` | Capa SEO de casos clínicos (ver punto 3). |

Y dos archivos existentes ganaron funcionalidad nueva: `js/blog-store.js` (subida y migración a Supabase Storage) y `admin/admin.js` (los seis puntos de subida del panel), explicados en el punto 5.

### En cada página

- `<title>` y `<meta description>` reescritos con la keyword principal delante y dentro del límite que Google muestra (55–58 y 153–156 caracteres).
- `<link rel="canonical">` absoluto en las tres páginas (antes faltaba en la home).
- `robots` con `max-image-preview:large` — sin esto Google muestra miniaturas pequeñas o ninguna.
- `lang="es-PE"` unificado (antes la home decía `es-PE` y las otras `es`), más `hreflang` autorreferencial.
- Open Graph y Twitter Card completos, con imagen **absoluta** y dimensiones declaradas. Antes `og:image` era una ruta relativa: WhatsApp y Facebook no la resolvían.
- `preconnect` a fuentes y a Supabase, `preload` de la imagen LCP, y las fuentes de Google cargadas sin bloquear el render.

### Datos estructurados (schema.org)

Grafo de entidades enlazado por `@id`, de modo que Google entienda que la clínica, la web, el equipo y los casos son la misma organización:

- **Home** — `Dentist` + `MedicalClinic` + `LocalBusiness` con dirección, teléfono, horarios, zonas atendidas, 9 procedimientos y acción de reserva por WhatsApp; más `WebSite`, `WebPage`, la `Dra. Belén Torres` y el bloque `FAQPage`.
- **Casos clínicos** — `CollectionPage` + `BreadcrumbList`, y un `ItemList` inyectado en runtime con los casos reales de Supabase.
- **Dr. Anthony** — `ProfilePage` + `BreadcrumbList` + `Person`/`Physician` con formación, credenciales, áreas de especialidad, redes (`sameAs`) y la propiedad de la clínica (`owns`). Señal E-E-A-T, decisiva en el sector salud. Su CV pasó de inyectarse por JS a estar escrito en el HTML (ver punto 2).

### Contenido

- Nueva sección **Preguntas frecuentes** con 6 preguntas visibles. Es la mayor ganancia de tráfico de cola larga: cubre búsquedas como *"cuánto dura la ortodoncia"*, *"la ortodoncia duele"*, *"edad límite brackets"*.
- Migas de pan visibles en las dos subpáginas.
- Landmark `<main>` y skip-link de accesibilidad.

> **Nota honesta sobre el FAQ:** Google retiró los *rich results* de FAQ el 7 de mayo de 2026, así que el desplegable ya no aparece en los resultados. El marcado se mantiene porque Google lo sigue leyendo para entender la página y porque Bing y los asistentes de IA lo consumen. El valor está en el texto visible, no en el snippet.

---

## 2. Datos del negocio y estrategia de entidad

Todo lo que faltaba está aplicado y verificado:

| Dato | Valor |
|---|---|
| Dominio canónico | `https://www.eurobraces.com/` — comprobado: `eurobraces.com` y `http://` ya redirigen ahí, así que el canonical coincide con el host real. |
| Coordenadas | `-12.118836570304472, -77.03454964778756` en `GeoCoordinates`, más `geo.position` e `ICBM` en el `<head>`. |
| Ficha de Google | `https://maps.google.com/?cid=4967172387234962248` en `hasMap` y en `sameAs` de la clínica. |
| Redes | Instagram, TikTok, YouTube (OrthoTube) y Facebook en `sameAs` del **Dr. Anthony**, más enlaces visibles con `rel="me"` en el pie de las tres páginas. |

### La ficha de Google se queda como está

La ficha se llama **"Dr. Anthony De Jesús / Especialista en Ortodoncia"** y el sitio dice **"EuroBraces Center"**. En una clínica cualquiera eso sería una incoherencia NAP que habría que corregir renombrando la ficha.

Aquí no, porque el doctor es el dueño y quiere posicionar su nombre. Renombrar la ficha habría desmontado justo la señal más fuerte que ya tiene para la búsqueda por su nombre. En vez de eso:

- El nombre exacto de la ficha está en `alternateName` de la clínica, para que Google reconozca que ambos rótulos designan el mismo local.
- La clínica declara `founder` y `owner` apuntando al nodo `Person` del doctor. Esa relación es la que permite tratar a la persona y al negocio como entidades **distintas pero vinculadas**: la autoridad de una refuerza a la otra, en lugar de fundirse en una sola entidad confusa.
- Sus cuatro redes cuelgan del `Person`, no del `LocalBusiness`, por la misma razón: son su marca personal.

### Qué se hizo para que su perfil salga al buscar su nombre

El problema real no era el schema. Era que **`dr-anthony-de-jesus.html` sólo tenía 174 palabras rastreables**: todo su CV vivía en `blog-store.js` y se inyectaba por JavaScript, así que Googlebot veía una página prácticamente vacía y no tenía con qué posicionarla.

Cinco cambios, de mayor a menor impacto:

1. **CV en el HTML de origen.** Formación académica, enfoque clínico, docencia y galería ahora están escritos en la página. JavaScript los reemplaza con lo que se edite en el panel; si no carga, el contenido sigue ahí. **174 → 581 palabras.**
2. **Bloque «Dónde atiende».** Asocia explícitamente la persona con el lugar físico, el horario y el teléfono. Es lo que conecta *"Dr. Anthony De Jesús"* con *"ortodoncista en Miraflores"* en el índice de Google.
3. **Autoría consolidada en los casos clínicos.** `js/seo-casos.js` ya no crea un `Person` suelto por caso: referencia su `@id` real. Google ve **una** entidad con N artículos clínicos firmados, no N personas homónimas. Es la señal E-E-A-T que más pesa en el sector salud.
4. **`mainEntityOfPage`, `owns` y `hasOccupation`** en su nodo `Person`, declarando que esa URL es su ficha canónica.
5. **Texto ancla real.** Los enlaces internos decían "Dr. Anthony" o "Ver perfil completo". Ahora dicen "Dr. Anthony De Jesús" desde la navegación, el pie y la tarjeta de equipo de las tres páginas. Google usa el texto ancla para saber de qué trata la página destino.

### Lo que falta y depende de él

El sitio ya no es el cuello de botella; las señales externas sí:

- **Poner `https://www.eurobraces.com/dr-anthony-de-jesus.html` como sitio web de la ficha de Google.** Si hoy apunta a la home, el enlace que Google más valora no está llegando a su perfil.
- **Enlazar esa misma URL desde la bio de Instagram, TikTok, Facebook y la descripción del canal de OrthoTube.** El `sameAs` declara la relación; los enlaces de vuelta la confirman. Sin ellos, la declaración pesa la mitad.
- **Reseñas en la ficha**, que es lo que decide el orden en el paquete local.

Aparte: las respuestas del FAQ deberían pasar por revisión clínica antes de publicarse.

---

## 3. Casos clínicos: cómo se resolvió la indexación

El catálogo se renderiza con JavaScript desde Supabase y cada caso se abre en un modal cambiando la URL a `?caso=<slug>`. Eso plantea dos problemas y cada uno tiene su solución:

**El rastreador podría no ver nada.** Si el script o la API fallan, la página quedaba vacía. Ahora `#blogGrid` trae cuatro casos reales escritos en el HTML de origen — título, resumen, autor, fecha e imágenes. JavaScript los reemplaza con el catálogo vivo cuando carga; si no carga, Google igual encuentra 1 100 palabras de contenido clínico real.

**Las URLs `?caso=` serían contenido duplicado.** Todas compartían título, descripción e imagen con el listado. Ahora `js/seo-casos.js` actualiza `<title>`, `description` y Open Graph al abrir un caso y los restaura al cerrar, de modo que compartir un caso por WhatsApp muestra ese caso. El `canonical` **no** se toca a propósito: sigue apuntando a `/casos-clinicos.html` para que Google consolide todas las variantes en una sola URL en vez de indexar cinco páginas casi idénticas.

Por la misma razón, `robots.txt` **no** bloquea `?caso=`. Bloquearlas impediría que Google leyera el canonical y acabarían como *"Detectada, actualmente sin indexar"*.

---

## 4. Publicar en Google Search Console

> El sitio ya está en línea en `https://www.eurobraces.com/` sirviendo la versión previa a esta optimización. El primer paso es desplegar estos cambios; hasta entonces Google seguirá viendo el HTML antiguo.

1. **Verifica la propiedad.** Entra a [search.google.com/search-console](https://search.google.com/search-console) y crea una propiedad de **dominio** (`eurobraces.com`, sin `https://` ni `www`) — cubre `http`, `https`, `www` y subdominios de una vez, que es justo lo que necesitas porque las cuatro variantes ya redirigen a `https://www.eurobraces.com/`. Requiere añadir un registro TXT donde tengas el DNS.
2. **Envía el sitemap.** *Sitemaps* → escribe `sitemap.xml` → Enviar. Vuelve en 2–3 días: debe decir "Correcto" con 3 URLs descubiertas.
3. **Inspecciona la home.** Pega `https://www.eurobraces.com/` en la barra superior → *Probar URL publicada* → *Ver página probada* → pestaña **HTML** y confirma que aparece el contenido. Luego *Solicitar indexación*.
4. **Repite solo con las otras dos URLs.** No uses "Solicitar indexación" de forma repetida: es un recurso limitado y pedirlo muchas veces no acelera nada.
5. **Apunta la ficha de Google al perfil del doctor.** En Google Business Profile, el campo "sitio web" debe llevar a `https://www.eurobraces.com/dr-anthony-de-jesus.html`, no a la home. Es el enlace externo que más peso tiene para posicionar su nombre (ver punto 2).

Plazo normal de indexación: entre 3 y 10 días.

### Comprueba que todo está bien

- Datos estructurados: [Rich Results Test](https://search.google.com/test/rich-results)
- Grafo completo de entidades: [Schema Markup Validator](https://validator.schema.org/)
- Rendimiento: [PageSpeed Insights](https://pagespeed.web.dev/)
- Tarjeta de WhatsApp/Facebook: [Sharing Debugger](https://developers.facebook.com/tools/debug/)

---

## 5. Imágenes: de base64 a Supabase Storage

### El problema

El panel guardaba cada foto como una cadena `data:image/jpeg;base64,...` **dentro de la propia fila** de Supabase, y el front la insertaba así en el HTML. Medido en la home: **12 imágenes ocupaban 2,2 MB de un DOM de 2,26 MB**.

Dos consecuencias, ambas malas para el posicionamiento:

- El LCP en móvil se hundía. Es una de las tres métricas de Core Web Vitals que Google usa como factor de ranking.
- Esas fotos **no existían para Google Imágenes**. Una URL `data:` no se puede rastrear ni indexar, así que los casos clínicos —el contenido más diferenciador de la clínica— quedaban fuera de la búsqueda de imágenes.

### Lo que ya está hecho en el código

- `BlogStore.uploadImage(blobOFile, nombre)` sube el binario a Supabase Storage y devuelve la URL pública. Se envía como `Blob` con `Cache-Control` de un año, no como texto base64.
- `prepareImage()` en el panel sustituye a la antigua conversión a base64: **los seis puntos de subida** (antes / durante / después, galería del caso, fotos de pacientes, retrato y galería del doctor) pasan ahora por Storage.
- **Respaldo seguro:** si la subida falla —bucket sin crear, sin red, política RLS— vuelve al base64 de siempre y avisa con un mensaje concreto. El panel nunca se queda sin poder guardar.
- `BlogStore.migrateEmbeddedImages()` recorre casos, fotos de pacientes y perfil del doctor, sube todo lo que siga en base64 y reescribe los registros. Es **idempotente**: repetirla sobre datos ya migrados no hace nada.
- Botón **«Migrar imágenes»** en la cabecera del panel, con confirmación previa, progreso y resumen de errores.

Probado con `fetch` interceptado: 6 imágenes migradas y 0 fallos sobre casos en modo galería y en modo antes/después; las URLs que ya eran públicas se dejan intactas; el centinela `[GALLERY_MODE]` se respeta; la segunda pasada devuelve 0. Los tres modos de fallo (bucket ausente, RLS, archivo grande) dan mensajes accionables.

### Lo que tienes que hacer tú, una sola vez

La clave anónima no puede crear buckets — lo comprobé y Supabase lo rechaza por RLS. Son dos minutos en el dashboard.

**1. Crear el bucket.** Supabase → **Storage** → **New bucket**:

| Campo | Valor |
|---|---|
| Name | `casos` |
| Public bucket | **activado** |
| File size limit | `2 MB` |
| Allowed MIME types | `image/jpeg, image/png, image/webp` |

**2. Añadir las políticas.** Supabase → **SQL Editor** → pega y ejecuta:

```sql
-- Lectura pública de los objetos (redundante en un bucket público, pero explícito)
create policy "casos_lectura_publica"
  on storage.objects for select
  to public
  using (bucket_id = 'casos');

-- Subida desde el panel de administración
create policy "casos_subida_anon"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'casos');

-- Sobrescritura, que es lo que usa la cabecera x-upsert
create policy "casos_update_anon"
  on storage.objects for update
  to anon
  using (bucket_id = 'casos')
  with check (bucket_id = 'casos');
```

**3. Migrar lo que ya está publicado.** Entra al panel → botón **«Migrar imágenes»** → confirmar. Sube las fotos que hoy siguen incrustadas y reescribe los registros. Al terminar, recarga la web pública: el peso del HTML debería caer de ~2,2 MB a unas decenas de KB.

**4. Comprobar.** Pasa la home por [PageSpeed Insights](https://pagespeed.web.dev/) antes y después. La diferencia en LCP móvil debería ser evidente.

### Una advertencia que toca decir

Esas políticas permiten subir archivos al bucket **a cualquiera que tenga la clave anónima**, y esa clave viaja en el JavaScript público. Es el mismo nivel de exposición que ya tiene la tabla `clinical_cases` hoy, así que no empeora nada, pero conviene saberlo.

El límite de 2 MB y la lista de MIME permitidos del paso 1 son justamente la contención: acotan qué se puede subir y cuánto. La solución de fondo sería autenticar el panel con Supabase Auth y cambiar las políticas de `anon` a `authenticated`. Hoy el panel valida la contraseña en el propio JavaScript del navegador, así que cualquiera que abra el código fuente puede saltárselo. Es un trabajo aparte del SEO; dímelo si quieres que lo aborde.

---

## 6. Otras mejoras pendientes

### Prioridad media

- **Página propia por tratamiento.** Hoy los 8 servicios son un `<h3>` con una línea de texto dentro de la home. Una página por tratamiento (`/ortodoncia-invisible-lima.html`, `/blanqueamiento-dental-miraflores.html`) con 600–900 palabras es lo que permite competir por esas búsquedas. Es la vía de crecimiento más grande que le queda al sitio.
- **Reseñas.** `AggregateRating` en los datos estructurados hace aparecer estrellas en los resultados, pero sólo es legítimo con reseñas reales y verificables recogidas en el sitio. No lo añadas con datos inventados: Google penaliza el marcado falso.
- **Comprimir imágenes del repositorio.** `lockup-navy.png` pesa 175 KB y `hero-navy.jpg` 138 KB. Convertirlas a WebP ahorra alrededor del 70 %.

### Prioridad baja

- Las fotos de pacientes son reconocibles. Conviene tener consentimiento por escrito antes de indexarlas — esto es legal, no SEO, pero un reclamo obliga a despublicar y eso sí borra posicionamiento ganado.
