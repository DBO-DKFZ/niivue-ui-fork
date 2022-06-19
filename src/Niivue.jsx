import { useRef } from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import { Grid, IconButton, Typography } from '@mui/material'
import { Container } from '@mui/material'
import { Button } from '@mui/material'
import { Box } from '@mui/material'
import { List } from '@mui/material'
import { ListItemButton } from '@mui/material'
import { ListItem } from '@mui/material'
import { ListItemIcon } from '@mui/material'
import { ListItemText } from '@mui/material'
import { Collapse } from '@mui/material'
import { Slider } from '@mui/material'
import { Input } from '@mui/material'
import { Select } from '@mui/material'
import { FormControl } from '@mui/material'
import { InputLabel } from '@mui/material'
import { MenuItem } from '@mui/material'
import { CssBaseline } from '@mui/material'
import { ExpandLess, ExpandMore, Delete, Replay } from '@mui/icons-material'
import { Visibility } from '@mui/icons-material'
import { VisibilityOff } from '@mui/icons-material'
import { Niivue } from '@niivue/niivue'
import { SettingsPanel } from './components/SettingsPanel'
import './Niivue.css'

const nv = new Niivue()

// function to interface with nv colors for 
// properties in the scene such as:
// crosshair color, background color, selection color, clip plane color
function setColor(prop, rgba01){
	// clip plane color has its own setting method in NiiVue
	if (prop === 'clipPlaneColor') {
		nv.setClipPlaneColor(rgba01) // needed because it sets a shader uniform value
		return
	}
	// other common properties with colors can be manipulated directly 
	// via their property name on the NiiVue.opts object
	nv.opts[prop] = rgba01
	nv.drawScene() // refresh the scene so that the changes take effect
}

// function interface to set the NiiVue crosshair size
function setCrosshairSize(size){
	nv.opts.crosshairWidth = size
	nv.drawScene()
}

// must be implemented after https://github.com/niivue/niivue/issues/321
function makeColorGradients(color='red') {
	let gradients = ''
	let c = colorMapFromKey(color)	
	let n = c.R.length // use R (red) property to calculate the number of gradient sections to use
	// make a string for the style
	gradients += `background: rgba(${c.R[n-1]},${c.G[n-1]},${c.B[n-1]},${1});`
	gradients += `background: linear-gradient(90deg,`
	// loop over number of gradient sections in color map
	for (let j=0; j< n; j++) {
		gradients += `rgba(${c.R[j]},${c.G[j]},${c.B[j]},${1}) ${(j/(n-1))*100}%,`
	}
	gradients = gradients.slice(0,-1)
	gradients += ');'
	return gradients
}


// the NiiVue canvas component (where all images are rendered) 
function NiivueDisplay ({imageList, setImageList, meshList, setMeshList}) {
	const canvas = useRef(null)
	useEffect(async () => {
    nv.attachToCanvas(canvas.current)
		await nv.loadVolumes(imageList)
		await nv.loadMeshes(meshList)
		nv.setClipPlane([-0.1, 270, 0])
		//await nv.loadVolumes([{url: 'mni152.nii'}, {url: 'hippo.nii', colorMap: 'winter'}]) // press the "v" key to cycle through volumes
		setImageList(nv.volumes)
		setMeshList(nv.meshes)
	}, [])

	return (
		<Grid item container xs={12} sm={12} md={8} lg={8}>
			<canvas ref={canvas} height={480} width={640} />
		</Grid>
	)
}

// Image list items components that show UI elements related to 
// NiiVue volumes and meshes.
// The UI elements in an Image list item can update NVImage properties
function ImageListItem({image, setImageList, crosshairValue=null, precision=4}) {
	const [visibilityIcon, setVisibilityIcon] = useState(<Visibility />)
	const [openMore, setOpenMore] = useState(false);
	const [minMax, setMinMax] = useState([image.global_min, image.global_max])
	const [color, setColor] = useState(image.colorMap ? image.colorMap : 'gray')
	useEffect(() => {
		setMinMax([image.global_min, image.global_max])
	}, [image])

	function visibilityToggle() {
		let idx = nv.getVolumeIndexByID(image.id)
		let currentOpacity = nv.volumes[idx].opacity
		let newOpacity = currentOpacity > 0 ? 0 : 1
		nv.setOpacity(idx, newOpacity)
		if (newOpacity == 0) {
			setVisibilityIcon(<VisibilityOff />)
		} else if (newOpacity == 1) {
			setVisibilityIcon(<Visibility />)
		}
	}

	const handleOpenMore = () => {
		setOpenMore(!openMore);
  };

	function handleSliderChange (event, newValue) {
		setMinMax(newValue); 
		//nv.volumes[nv.getVolumeIndexByID(image.id)].cal_min = newValue[0]; 
		//nv.volumes[nv.getVolumeIndexByID(image.id)].cal_max = newValue[1]; 
		//nv.updateGLVolume()
	}

	function handleSliderCommitted (event, newValue) {
		setMinMax(newValue); 
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_min = newValue[0]; 
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_max = newValue[1]; 
		nv.updateGLVolume()
	}


	function handleMinNumberInput (event) {
		setMinMax([Number(event.target.value), minMax[1]])
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_min = Number(event.target.value); 
		nv.updateGLVolume()
	}

	function handleMaxNumberInput (event) {
		setMinMax([minMax[0], Number(event.target.value)])
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_max = Number(event.target.value); 
		nv.updateGLVolume()
	}

	function handleIntensityReset(event) {
		setMinMax([image.global_min, image.global_max])
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_min = image.global_min; 
		nv.volumes[nv.getVolumeIndexByID(image.id)].cal_max = image.global_max; 
		nv.updateGLVolume()
	}

	function handleColorChange(event) {
		let color = event.target.value
		let id = nv.volumes[nv.getVolumeIndexByID(image.id)].setColorMap(color)
		nv.updateGLVolume()
		setColor(color)
	}

	function handleRemoveImage() {
		nv.removeVolume(image)
		setImageList([...nv.volumes])
	}

	return (
		<Box>
			<ListItemButton onClick={() => {/*set active image*/}}>
					<ListItemIcon onClick={(e) => { e.stopPropagation(); visibilityToggle(image)}}>
						{visibilityIcon}
					</ListItemIcon>
					<ListItemText>
						{image.name}
					</ListItemText>
					<Typography style={{marginLeft:'auto'}}>
						{crosshairValue === null ? '' : crosshairValue.toFixed(precision)}
					</Typography>
					{openMore ? <ExpandLess onClick={handleOpenMore}/> : <ExpandMore onClick={handleOpenMore} />}
			</ListItemButton>
			<Collapse in={openMore} timeout='auto' unmountOnExit>
				<List component='div' disablePadding>
					<ListItem>
						<Input
							size='small'
							style={{marginRight:'4px', marginLeft: '4px'}}
							value={Number(minMax[0])}
							inputProps={{
								step: 1.0,
								min: image.global_min || 0,
								max: image.global_max || 999,
								type: 'number'
							}}
							onInput={handleMinNumberInput}
						>
						</Input>
						<Slider 
							style={{
								marginLeft: '12px',
								marginRight: '12px'
							}}
							min={image.global_min || 0}
							max={image.global_max || 999} 
							size='small'
							value={minMax} 
							valueLabelDisplay="auto" 
							onChange={handleSliderChange}
							onChangeCommitted={handleSliderCommitted}
						>
						</Slider>
						<Input
							size='small'
							style={{marginLeft:'4px', marginRight: '4px'}}
							value={Number(minMax[1])}
							inputProps={{
								step: 1.0,
								min: image.global_min || 0,
								max: image.global_max || 999,
								type: 'number'
							}}
							onInput={handleMaxNumberInput}
						>
						</Input>
						<IconButton style={{marginRight: '0px', marginLeft:'auto'}} onClick={handleIntensityReset}>
							<Replay />
						</IconButton>
					</ListItem>
					<ListItem>	
					<FormControl fullWidth>
						<InputLabel>Color</InputLabel>
						<Select
							style={{marginRight: 'auto', width: '100%'}}
							value={color}
							label="Color"
							size="small"
							onChange={handleColorChange}
						>
						{
							nv.colorMaps().map(c => {
								return (
										<MenuItem value={c} key={c}>{c}</MenuItem>
								)
							})
						}
						</Select>
					</FormControl>
						<IconButton style={{marginRight: '0px', marginLeft:'auto'}} onClick={handleRemoveImage}>
							<Delete />
						</IconButton>
					</ListItem>
				</List>
			</Collapse>
		</Box>
	)

}


// Image list Panel is a component that shows all loaded
// NVimages and NVmeshes. It contains one ImageListItem per row in the list
function ImageListPanel({imageList, setImageList, crosshairValues}) {
	let listItems = []
	for (let i=imageList.length-1; i>=0; i--) {
		listItems.push(<ImageListItem image={imageList[i]} key={i} setImageList={setImageList} crosshairValue={crosshairValues[i]}/>)
	}
	return (
		<Grid container item xs={12} sm={12} md={4} lg={4} >
			<List sx={{width:'100%', bgcolor: 'background.paper'}} component='div'>
				{listItems}
			</List>
		</Grid>
	)
}

// NiiVueToolbar shows UI elements for changes some common NV settings quickly
function NiiVueToolbar({}){
	const [open, setOpen] = useState(false)

	return (	
			<Grid item container xs={12} spacing={2}>
				<Grid item xs={12} sm={12} md={4} lg={4}>
					<Box sx={{
						display: 'flex',
						flexDirection: 'row'
					}}
					>
					<Button onClick={()=>{setOpen(true)}}>Settings</Button>
					<Button>Add image</Button>
				</Box>
				</Grid>
				<Grid item xs={12} sm={12} md={8} lg={8}>
					<Box sx={{
						display: 'flex',
						flexDirection: 'row',
						alignItems:'center'
					}}
					>
					<Button onClick={()=>{nv.setSliceType(nv.sliceTypeMultiplanar)}}>
						2D
					</Button>
					<Button onClick={()=>{nv.setSliceType(nv.sliceTypeRender)}}>
						3D
					</Button>
				</Box>
				</Grid>
				<SettingsPanel setCrosshairSize={setCrosshairSize} setColor={setColor} open={open} setOpen={setOpen} />
			</Grid>
		)
}

// The NiiVue component wraps all other components in the UI. 
// It is exported so that it can be used in other projects easily
export default function NiiVue({images=[], meshes=[]}) {
	const [imageList, setImageList] = useState(images)
	const [meshList, setMeshList] = useState(meshes)
	const [crosshairValues, setCrosshairValues] = useState([])
	//const [activeImage, setActiveImage] = useState(0) // the index of the active image (the layer with focus)
	nv.on('location', (data) => {
		setCrosshairValues(data.values)
	})

	nv.on('intensityRange', (nvimage) => {
		setIntensityRange(nvimage)
	})

  return (
		<Container component="main" style={{height: '100%'}} maxWidth={'100%'}>
			<CssBaseline enableColorScheme />
			<Box sx={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				height: '100%'
				}}
			>	
				<Grid container spacing={2}>
					<NiiVueToolbar />
					<ImageListPanel
						imageList={imageList} 
						setImageList={setImageList} 
						meshList={meshList}
						setMeshList={setMeshList}
						crosshairValues={crosshairValues}/> 
					<NiivueDisplay 
						imageList={imageList} 
						setImageList={setImageList} 
						meshList={meshList} 
						setMeshList={setMeshList}/>	
				</Grid>
			</Box>
		</Container>
  )
}
