const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatCurrency = (value: number) => {
  return brlFormatter.format(value);
};

export const formatSignedCurrency = (value: number) => {
  if (value > 0) return `+${formatCurrency(value)}`;
  if (value < 0) return `-${formatCurrency(Math.abs(value))}`;
  return formatCurrency(0);
};

export const getDifferenceVisualState = (value: number) => {
  if (value > 0) {
    return {
      label: "Ganho",
      textClassName: "text-green-700",
      badgeClassName: "bg-green-100 text-green-800 border border-green-300",
      iconContainerClassName: "bg-green-100 dark:bg-green-900/30",
    };
  }
  if (value < 0) {
    return {
      label: "Perda",
      textClassName: "text-red-700",
      badgeClassName: "bg-red-100 text-red-800 border border-red-300",
      iconContainerClassName: "bg-red-100 dark:bg-red-900/30",
    };
  }
  return {
    label: "Sem diferença",
    textClassName: "text-slate-700",
    badgeClassName: "bg-slate-100 text-slate-800 border border-slate-300",
    iconContainerClassName: "bg-slate-100 dark:bg-slate-800/60",
  };
};
