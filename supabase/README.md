# Supabase — configuración de infraestructura

## Qué hay aquí

`setup-storage.sql` crea el bucket `casos` y sus políticas de acceso. Es idempotente: se puede ejecutar las veces que haga falta.

---

## Cómo ejecutarlo

### Opción A — Dashboard (2 minutos, sin credenciales de por medio)

Supabase → **SQL Editor** → **New query** → pegar el contenido de `setup-storage.sql` → **Run**.

La última consulta devuelve una fila de comprobación: el bucket debe salir con `public = true`, `file_size_limit = 2097152` y `politicas = 3`.

### Opción B — Management API (para automatizarlo)

Requiere un **Personal Access Token** de Supabase (ver abajo):

```bash
curl -sS -X POST \
  "https://api.supabase.com/v1/projects/ufgfsethtoefnzmlwdhv/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$(jq -Rs '{query: .}' supabase/setup-storage.sql)"
```

---

## Credenciales: cuál hace falta y por qué

Para esta tarea concreta hay que hacer dos cosas, y **no las cubre la misma clave**:

| Tarea | Qué la permite |
|---|---|
| Crear el bucket | Clave secreta (`service_role` / `sb_secret_…`) **o** SQL |
| Crear las políticas RLS | **Sólo** SQL — es DDL, y la API de datos no ejecuta DDL |

Por eso la clave secreta **no basta**: no puede crear políticas. El **Personal Access Token** sí hace ambas cosas, porque ejecuta SQL. Es la única credencial necesaria.

### Cómo obtener el Personal Access Token

1. Entra a [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. **Generate new token**
3. Nombre: `claude-code-infra` — que se distinga, para poder revocarlo solo
4. Copia el valor (empieza por `sbp_`). Se muestra **una sola vez**

### Dónde guardarlo

**Fuera del repositorio.** Este repo es público y un secreto commiteado queda expuesto para siempre, incluso si se borra después: hay que rotarlo.

Crea el archivo `C:\Users\Andree\.eurobraces\supabase.env` — fuera del proyecto, así no hay forma de commitearlo por accidente:

```
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=ufgfsethtoefnzmlwdhv
```

El `.gitignore` de la raíz cubre además `.env`, `*.key`, `*.pem` y similares como red de seguridad, por si algún secreto acaba dentro del proyecto de todos modos.

---

## Lo que este token permite, dicho claro

Un Personal Access Token de Supabase es **una credencial de administración de cuenta**, no de un proyecto. Con él se puede:

- Ejecutar cualquier SQL sobre la base de datos, incluido leer y borrar todos los datos
- Ver y cambiar la configuración de los proyectos
- **Eliminar proyectos enteros**
- Acceder a los demás proyectos de la misma cuenta, si los hubiera

Es más potente que la clave `service_role`, no menos. La diferencia a su favor es que se revoca en un clic, se puede nombrar, y **no vive dentro de la aplicación**: si el `service_role` se filtra, un atacante lo usa directamente contra la API de datos desde cualquier parte.

### Higiene mínima

- **Un token por propósito**, con nombre reconocible. Nunca reutilizar el mismo para varias cosas.
- **Revocar en cuanto deje de hacer falta**, en la misma página donde se creó.
- **Nunca pegarlo en un chat, un issue, un commit ni una captura.** Si pasa, darlo por comprometido y rotarlo — borrar el mensaje no deshace la exposición.
- Rotarlo cada cierto tiempo aunque no haya sospecha.

### La alternativa sin credenciales

La Opción A del principio no requiere darle a nadie ninguna credencial: se pega el SQL en el dashboard y listo. Para una tarea puntual como esta, sigue siendo la opción más segura, y el SQL de este directorio está escrito precisamente para poder auditarlo antes de ejecutarlo.
