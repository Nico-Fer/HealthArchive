interface InputProps {
    type: string;
    id: string;
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
};

const InputComponent : React.FC<InputProps> = (props) => {
    return(
        <div className="mb-3" style={{ width: '25rem' }}>
         <label htmlFor={props.id}></label>
            <input
            className="form-control rounded shadow"
            type={props.type}
            id={props.id}
            value={props.value}
            onChange={props.onChange}
            style={{ border: '1px solid #EAEAEA', height: '50px' }}
            placeholder={props.placeholder}
            />
        </div>
    );
};

export default InputComponent;