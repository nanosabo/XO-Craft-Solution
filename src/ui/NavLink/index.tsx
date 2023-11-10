import React, { FC } from "react";
import { NavLink as Link, useLocation } from "react-router-dom";
import useNavLinkClassName from "@src/hooks/useNavLinkClassName";

type Props = {
  href: string;
  icon: React.ReactNode;
  title: string;
};

const NavLink: FC<Props> = ({ href, icon, title }) => {
  const className = useNavLinkClassName(href);
  const { pathname } = useLocation();

  const handleClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    if (pathname === href) {
      event.preventDefault();
    }
  };

  return (
    <Link className={className} to={href} onClick={handleClick}>
      {icon} {title}
    </Link>
  );
};

export default NavLink;
