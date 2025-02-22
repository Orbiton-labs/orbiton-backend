import BigDecimal from 'js-big-decimal';

const main = async () => {
  const value1 = new BigDecimal('1.0');
  const value2 = new BigDecimal('2.0');
  console.log(value1.compareTo(value2));
};

main();
