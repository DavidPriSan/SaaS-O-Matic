import { useNavigate } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { CustomerForm } from './CustomerForm';
import styles from './NewCustomerPage.module.css';

export function NewCustomerPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader
        title="Nuevo cliente"
        subtitle="Registra un cliente corporativo. En España se valida el DNI/NIE/CIF con el algoritmo oficial."
        backTo={{ to: '/', label: 'Volver a clientes' }}
      />
      <CustomerForm onCreated={(customer) => navigate(`/customers/${customer.id}`)} />
    </div>
  );
}
