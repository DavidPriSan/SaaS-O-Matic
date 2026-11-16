# Spec 02 · Validación del identificador fiscal

> Implementación: `packages/shared/src/fiscal-id/`. Se usa en el backend (autoridad) y en el formulario del front (feedback inmediato).

## 1. Normalización (siempre, para cualquier país)
1. `trim()` y mayúsculas.
2. Eliminar espacios, guiones y puntos (`12.345.678-z` → `12345678Z`).
3. El valor **normalizado** es el que se valida, se persiste y se busca.

## 2. API del módulo

```ts
type SpanishIdType = 'DNI' | 'NIE' | 'NIF_SPECIAL' | 'CIF';

type FiscalIdResult =
  | { valid: true;  normalized: string; type: SpanishIdType | 'GENERIC' }
  | { valid: false; normalized: string; reason: FiscalIdError };

type FiscalIdError = 'EMPTY' | 'INVALID_FORMAT' | 'INVALID_CONTROL';

validateFiscalId(raw: string, countryCode: CountryCode): FiscalIdResult;
```

## 3. España (`countryCode === 'ES'`): algoritmo oficial

Tabla de letras de control (módulo 23): `TRWAGMYFPDXBNJZSQVHLCKE`.

### 3.1 DNI: `^\d{8}[A-Z]$`
`letra === TABLA[numero % 23]`.

### 3.2 NIE: `^[XYZ]\d{7}[A-Z]$`
Se sustituye la letra inicial: X→0, Y→1, Z→2. Después se aplica el algoritmo del DNI sobre los 8 dígitos resultantes.

### 3.3 NIF especiales: `^[KLM]\d{7}[A-Z]$`
K (menores de 14), L (residentes en el extranjero) y M (extranjeros sin NIE). La letra de control se calcula con `TABLA[7 dígitos % 23]`.

### 3.4 CIF (personas jurídicas): `^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$`
Sobre los 7 dígitos centrales (posiciones 1 a 7):
1. `A` = suma de los dígitos en posiciones **pares** (2, 4, 6).
2. `B` = para cada dígito en posición **impar** (1, 3, 5, 7): se multiplica por 2 y se suman las cifras del resultado (14 → 1 + 4 = 5).
3. `C` = A + B. `digito = (10 - C % 10) % 10`.
4. Letra equivalente: `'JABCDEFGHI'[digito]`.
5. El tipo de control depende de la letra de entidad:
   - **Debe ser letra**: `P, Q, R, S, N, W`.
   - **Debe ser dígito**: `A, B, E, H`.
   - **Cualquiera de los dos**: el resto (`C, D, F, G, J, U, V`).

## 4. Resto de países: validación genérica
`^[A-Z0-9]{4,20}$` sobre el valor normalizado. No hay comprobación algorítmica (fuera de alcance, ver A4).

## 5. Vectores de test

| Entrada | País | Resultado |
|---------|------|-----------|
| `12345678Z` | ES | ✅ DNI |
| `12.345.678-z` | ES | ✅ DNI (normalizado `12345678Z`) |
| `12345678A` | ES | ❌ INVALID_CONTROL |
| `1234567Z` | ES | ❌ INVALID_FORMAT |
| `X1234567L` | ES | ✅ NIE |
| `Y1234567X` | ES | ✅ NIE (11234567 % 23 = 10 → X) |
| `X1234567A` | ES | ❌ INVALID_CONTROL |
| `B12345674` | ES | ✅ CIF (dígito) |
| `B1234567D` | ES | ❌ INVALID_CONTROL (B exige dígito) |
| `Q1234567D` | ES | ✅ CIF (letra) |
| `Q12345674` | ES | ❌ INVALID_CONTROL (Q exige letra) |
| `G12345674` / `G1234567D` | ES | ✅ CIF (G admite ambos) |
| `I12345674` | ES | ❌ INVALID_FORMAT (I no es una letra de entidad válida) |
| `` (vacío) | ES | ❌ EMPTY |
| `DE123456789` | DE | ✅ GENERIC |
| `fr-ab12` | FR | ✅ GENERIC (normalizado `FRAB12`) |
| `a-1` | FR | ❌ INVALID_FORMAT (normalizado `A1`, menos de 4 caracteres) |

> Nota: vectores verificados con un script independiente y desechable antes de fijarlos en la spec (ver vibe-log 01).
