import { styled } from '@mui/material/styles';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCBPi } from '../data';
import { fileError } from '../data/kettleapi';
import ActorValue from '../util/ActorValue';
import DeleteDialog from '../util/DeleteDialog';
import SensorValue from '../util/SensorValue';
import { saveKettleFile } from './kettleFile';

const PREFIX = 'KettleTable';

const classes = {
    table: `${PREFIX}-table`
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled('div')({
    [`& .${classes.table}`]: {
        minWidth: 650,
    },
});

const KettleTable = () => {

    const navigate = useNavigate();
    const { state, actions } = useCBPi()
    // What saving a kettle to a file came to, under the table.
    const [fileStatus, setFileStatus] = useState(null);

    const remove_callback = (id) => {
        actions.delete_kettle(id)
    }

    const saveFile = async (row) => {
        setFileStatus({ severity: "info", text: `Saving ${row.name} to a file…` });
        try {
            const name = await saveKettleFile(row.id);
            setFileStatus({ severity: "success", text: `Saved ${name}.` });
        } catch (error) {
            setFileStatus({ severity: "error", text: `Couldn't save ${row.name} to a file. ${fileError(error, "CraftBeerPi couldn't make it.")}` });
        }
    }

    return (
        (<Root>
            <TableContainer >
                <Table className={classes.table} dense table size="small" aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right" className="hidden-xs">Logic</TableCell>
                            <TableCell align="right" className="hidden-xs">Heater</TableCell>
                            <TableCell align="right" className="hidden-xs">Agitator</TableCell>
                            <TableCell align="right" className="hidden-xs">Sensor</TableCell>
                            <TableCell align="right" className="hidden-xs">Target Temp</TableCell>
                            <TableCell align="right" className="hidden-xs">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {state.kettle.map((row) => (
                            <TableRow key={row.id}>
                                <TableCell component="th" scope="row">
                                    
                                        {row.name}
                                    
                                </TableCell>
                                <TableCell align="right" className="hidden-xs">{row.type}</TableCell>
                                <TableCell align="right" className="hidden-xs"><ActorValue id={row.heater}/></TableCell>
                                <TableCell align="right" className="hidden-xs" ><ActorValue id={row.agitator}/></TableCell>
                                <TableCell align="right" className="hidden-xs"><SensorValue id={row.sensor} digits={1}/></TableCell>
                                <TableCell align="right" className="hidden-xs">{row.target_temp}</TableCell>
                                <TableCell align="right" className="hidden-xs">
                                    <DeleteDialog title="Delete Kettle" message="Do you want to delete" id={row.id} callback={remove_callback} />
                                    <IconButton aria-label="delete" size="small" onClick={() => { navigate("/kettle/"+row.id) }} >
                                      <VisibilityIcon />
                                    </IconButton>
                                    <Tooltip title="Save to file…">
                                      <IconButton aria-label={`Save ${row.name} to a file`} size="small" onClick={() => saveFile(row)} data-kettle-file="save-row">
                                        <FileDownloadOutlinedIcon />
                                      </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            {fileStatus ? (
                <Alert
                    severity={fileStatus.severity}
                    variant="outlined"
                    role={fileStatus.severity === "error" ? "alert" : "status"}
                    onClose={() => setFileStatus(null)}
                    sx={{ mt: 1, py: 0 }}
                    data-kettle-file="table-status"
                >
                    {fileStatus.text}
                </Alert>
            ) : null}
        </Root>)
    );
}

export default  KettleTable