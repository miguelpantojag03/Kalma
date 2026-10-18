import { View } from 'react-native';
import { KText } from '@/components/ui';
import { space } from '@/theme';

/**
 * Términos y privacidad en lenguaje claro (borrador del prototipo académico; no es un documento
 * legal revisado). Se muestran dentro de la app para no sacar a la persona del flujo.
 */
export function LegalSheetContent({ kind }: { kind: 'terms' | 'privacy' }) {
  const items =
    kind === 'terms'
      ? [
          'Kalma es un prototipo académico de la materia Diseño de Interfaces.',
          'Kalma no diagnostica, no receta y no reemplaza a tu médico. No es un servicio de emergencias: si es una emergencia, llama al 123.',
          'Los patrones son coincidencias en tus datos, no causas comprobadas.',
          'Puedes dejar de usar Kalma y eliminar tu cuenta cuando quieras.',
        ]
      : [
          'Guardamos tu nombre, tu correo y los registros que tú haces (síntomas, comidas, sueño, medicamentos).',
          'Los usamos solo para mostrarte tus registros, tus patrones y el reporte que tú decidas compartir.',
          'Tus datos están protegidos: cada cuenta solo puede ver sus propios datos.',
          'No vendemos ni compartimos tus datos. Puedes exportarlos o eliminarlos en Perfil › Cuenta.',
          'Los datos de salud se tratan como datos sensibles (Ley 1581 de 2012); el consentimiento para ellos se pide aparte.',
        ];
  return (
    <View style={{ gap: space[3], paddingBottom: space[4] }}>
      {items.map((t) => (
        <KText key={t}>• {t}</KText>
      ))}
    </View>
  );
}
