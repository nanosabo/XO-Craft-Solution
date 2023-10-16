import { FC } from "react";
import { NavLink } from "react-router-dom";
import useNavLinkClassName from "@src/hooks/useNavLinkClassName";

type Props = {
  href: string;
  icon: React.ReactNode;
  title: string;
};

const NavigationLink: FC<Props> = ({ href, icon, title }) => {
  const className = useNavLinkClassName(href);

  return (
    <NavLink className={className} to={href}>
      {icon} {title}
    </NavLink>
  );
};

export default NavigationLink;
