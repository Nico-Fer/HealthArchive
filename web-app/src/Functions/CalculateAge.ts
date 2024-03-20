import formatDate from "./FormatDate";

function CalculateAge(date: Date): number {

    const birthDate = new Date(formatDate(date))
    const today = new Date();
    
    const birthYear = birthDate.getFullYear();
    const birthMonth = birthDate.getMonth();
    const birthDay = birthDate.getDate();
    
    const age = today.getFullYear() - birthYear;
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
  
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      return age - 1;
    } else {
      return age;
    }
  }

export default CalculateAge;