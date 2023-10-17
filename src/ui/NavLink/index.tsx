import { FC } from "react";
import { NavLink as Link } from "react-router-dom";
import useNavLinkClassName from "@src/hooks/useNavLinkClassName";

type Props = {
  href: string;
  icon: React.ReactNode;
  title: string;
};

const NavLink: FC<Props> = ({ href, icon, title }) => {
  const className = useNavLinkClassName(href);

  return (
    <Link className={className} to={href}>
      {icon} {title}
    </Link>
  );
};

export default NavLink;
