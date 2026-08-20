import React from 'react';
import Link from 'next/link';
import styles from './button.module.css';

type ButtonProps = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'solid' | 'outline';
  className?: string;
  icon?: React.ReactNode;
};

export const Button = ({ href, onClick, children, variant = 'solid', className = '', icon }: ButtonProps) => {
  const baseClassName = `${styles.button} ${styles[variant]} ${className}`;
  
  const content = (
    <>
      {children}
      {icon && <span className={styles.iconWrapper}>{icon}</span>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClassName}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={baseClassName}>
      {content}
    </button>
  );
};
