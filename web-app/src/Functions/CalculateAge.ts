import { toLocalDate, today } from "./DateUtils";

/**
 * Edad en años cumplidos, o null si no hay fecha de nacimiento cargada.
 *
 * Trabaja con la fecha local: antes reparseaba el 'yyyy-MM-dd' con `new Date(...)`, que
 * lo interpreta como UTC medianoche, y en UTC-3 devolvía la edad corrida un día.
 */
function CalculateAge(date: Date | string | null | undefined): number | null {

    const birthDate = toLocalDate(date);
    if (!birthDate) return null;

    const now = today();

    const birthYear = birthDate.getFullYear();
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();

    const age = now.getFullYear() - birthYear;
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();

    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      return age - 1;
    } else {
      return age;
    }
  }

export default CalculateAge;
